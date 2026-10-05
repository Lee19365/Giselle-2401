// Cliente HTTP de SnailPay para el frontend.
// El formulario solo trabaja con PaymentResult: no interpreta códigos HTTP
// ni la forma cruda de la respuesta.

import { PAYMENT_STATUSES } from "./wallet.types";
import type {
  PaymentRequest,
  PaymentResponse,
  PaymentStatus,
} from "./wallet.types";

const PAYMENTS_ENDPOINT = "/api/snailpay/payments";
const DEFAULT_TIMEOUT_MS = 10_000;

// --- TIPOS DEL RESULTADO ---

// Mensajes por campo con los nombres del backend (card_number, expiration_date...).
// Traducirlos a los nombres del formulario es trabajo del formulario.
export type FieldErrors = Record<string, string>;

export type PaymentResult =
  | { kind: "approved"; message: string; payment: PaymentResponse }
  | {
      kind: "rejected";
      message: string;
      reason: "card_declined" | "invalid_data";
      payment: PaymentResponse;
      // Vacío cuando la tarjeta fue rechazada; con datos inválidos trae
      // el mensaje de cada campo que falló.
      fieldErrors: FieldErrors;
    }
  | { kind: "unavailable"; message: string }
  | { kind: "timeout"; message: string }
  | { kind: "invalid-response"; message: string }
  | { kind: "network-error"; message: string };

// --- MENSAJES PARA EL USUARIO ---

const MESSAGES = {
  cardDeclined:
    "Tu tarjeta fue rechazada. Verifica los datos o prueba con otra tarjeta.",
  invalidData:
    "Algunos datos no son válidos. Revisa el formulario e inténtalo de nuevo.",
  unavailable:
    "El servicio de pagos no está disponible en este momento. No se realizó ningún cargo. Inténtalo de nuevo en unos minutos.",
  timeout:
    "La solicitud tardó demasiado y no pudimos confirmar el resultado. Tu saldo no se modificó.",
  // Deliberadamente prudente: cubre tanto una respuesta incoherente (que pudo
  // haberse procesado) como un JSON mal formado (donde nunca se procesó nada).
  invalidResponse:
    "Recibimos una respuesta inesperada del servicio de pagos y no pudimos confirmar el resultado del pago.",
  networkError:
    "No pudimos conectarnos con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.",
} as const;

// --- VALIDACIÓN DE LA FORMA DE LA RESPUESTA ---

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPaymentStatus(value: unknown): value is PaymentStatus {
  return (
    typeof value === "string" &&
    (PAYMENT_STATUSES as readonly string[]).includes(value)
  );
}

// Comprueba los 11 campos y que status tenga un valor conocido.
// Las respuestas { error } (JSON mal formado) y los 500 no la cumplen.
function isPaymentResponse(data: unknown): data is PaymentResponse {
  if (!isRecord(data)) {
    return false;
  }

  return (
    typeof data.id === "string" &&
    isPaymentStatus(data.status) &&
    typeof data.status_detail === "string" &&
    typeof data.transaction_amount === "number" &&
    Number.isFinite(data.transaction_amount) &&
    typeof data.date_created === "string" &&
    (data.authorization_code === null ||
      typeof data.authorization_code === "string") &&
    typeof data.reference === "string" &&
    typeof data.payer_id === "string" &&
    typeof data.payer_email === "string" &&
    typeof data.card_number === "string" &&
    typeof data.cvv === "string"
  );
}

// El servidor repite lo que se le envió. Si el monto o el pagador no coinciden,
// no se confía en la respuesta: de este monto depende el saldo.
// validatePayment recorta (trim) payer_id y payer_email antes de repetirlos,
// por eso se comparan recortados. String() evita que un valor ausente lance
// una excepción dentro de createPayment: simplemente no coincidirá.
function matchesRequest(
  payment: PaymentResponse,
  body: PaymentRequest
): boolean {
  return (
    payment.transaction_amount === body.amount &&
    payment.payer_id === String(body.payer_id).trim() &&
    payment.payer_email === String(body.payer_email).trim()
  );
}

// Toma el campo "errors" de las respuestas 400, ignorando lo que no sea texto.
// "general" se descarta: es un error técnico del cuerpo de la petición (el
// formulario siempre envía un objeto) y no lo puede corregir el usuario; el
// aviso general ya lo da `message`.
function extractFieldErrors(data: unknown): FieldErrors {
  if (!isRecord(data) || !isRecord(data.errors)) {
    return {};
  }

  const fieldErrors: FieldErrors = {};

  for (const [field, message] of Object.entries(data.errors)) {
    if (field !== "general" && typeof message === "string") {
      fieldErrors[field] = message;
    }
  }

  return fieldErrors;
}

// --- RESULTADOS SIN DATOS DE PAGO ---

function timeoutResult(): PaymentResult {
  return { kind: "timeout", message: MESSAGES.timeout };
}

function networkErrorResult(): PaymentResult {
  return { kind: "network-error", message: MESSAGES.networkError };
}

function invalidResponseResult(): PaymentResult {
  return { kind: "invalid-response", message: MESSAGES.invalidResponse };
}

// --- INTERPRETACIÓN DE LA RESPUESTA ---

// Traduce código HTTP + cuerpo a un PaymentResult. El código HTTP y el
// status del cuerpo deben ser coherentes, y un pago aprobado debe coincidir
// con lo que se pidió; si no, no se confía en la respuesta.
function interpretResponse(
  httpStatus: number,
  data: unknown,
  body: PaymentRequest
): PaymentResult {
  if (!isPaymentResponse(data)) {
    return invalidResponseResult();
  }

  switch (httpStatus) {
    case 200:
      // Un pago aprobado siempre trae código de autorización y repite
      // el monto y el pagador que se enviaron.
      if (
        data.status === "approved" &&
        data.authorization_code !== null &&
        matchesRequest(data, body)
      ) {
        return {
          kind: "approved",
          message: `Pago aprobado. Tu referencia es ${data.reference}.`,
          payment: data,
        };
      }
      break;

    case 402:
      if (data.status === "rejected") {
        return {
          kind: "rejected",
          message: MESSAGES.cardDeclined,
          reason: "card_declined",
          payment: data,
          fieldErrors: {},
        };
      }
      break;

    case 400:
      if (data.status === "rejected") {
        return {
          kind: "rejected",
          message: MESSAGES.invalidData,
          reason: "invalid_data",
          payment: data,
          fieldErrors: extractFieldErrors(data),
        };
      }
      break;

    case 503:
      if (data.status === "error") {
        return { kind: "unavailable", message: MESSAGES.unavailable };
      }
      break;
  }

  return invalidResponseResult();
}

// --- FUNCIÓN PÚBLICA ---

export async function createPayment(
  body: PaymentRequest,
  { timeoutMs = DEFAULT_TIMEOUT_MS }: { timeoutMs?: number } = {}
): Promise<PaymentResult> {
  const controller = new AbortController();
  // Nada más aborta este controlador, así que signal.aborted significa timeout.
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response: Response;

    try {
      response = await fetch(PAYMENTS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      return controller.signal.aborted ? timeoutResult() : networkErrorResult();
    }

    let data: unknown;

    // El timer sigue activo mientras se lee el cuerpo, así que un timeout
    // durante la lectura también se detecta aquí.
    try {
      data = await response.json();
    } catch {
      return controller.signal.aborted
        ? timeoutResult()
        : invalidResponseResult();
    }

    return interpretResponse(response.status, data, body);
  } finally {
    // Se limpia en todos los caminos: éxito, error y cada return anticipado.
    clearTimeout(timer);
  }
}