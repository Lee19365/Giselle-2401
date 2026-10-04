import type { PaymentRequest } from "./snailpay.types";

// Campos explícitos para que el compilador detecte nombres mal escritos
export interface ValidationErrors {
  card_number?: string;
  expiration_date?: string;
  cvv?: string;
  cardholder_name?: string;
  amount?: string;
  payer_id?: string;
  payer_email?: string;
  general?: string;
}

type PaymentValidationResult =
  | {
      valid: true;
      payment: PaymentRequest;
    }
  | {
      valid: false;
      errors: ValidationErrors;
    };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cardNumberRegex = /^\d{16}$/;
const expirationDateRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
const cvvRegex = /^\d{3}$/;
export function validatePayment(
  data: unknown
): PaymentValidationResult {
  const errors: ValidationErrors = {};

  // Validar que la entrada sea un objeto no nulo
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
  errors.general = "El cuerpo de la petición debe ser un objeto válido.";

    return {
      valid: false,
      errors,
    };
  }

  const body = data as Record<string, unknown>;

  // --- CARD NUMBER ---
  if (typeof body.card_number !== "string") {
    errors.card_number = "El número de tarjeta debe ser un texto.";
  } else if (!cardNumberRegex.test(body.card_number)) {
    errors.card_number = "El número de tarjeta debe tener 16 dígitos.";
  }

  // --- EXPIRATION DATE ---
  // Se valida únicamente el formato MM/YY y no la vigencia
  // contra la fecha actual.
  if (typeof body.expiration_date !== "string") {
    errors.expiration_date =
      "La fecha de vencimiento debe ser un texto.";
  } else if (!expirationDateRegex.test(body.expiration_date)) {
    errors.expiration_date =
      "La fecha de vencimiento debe tener el formato MM/YY.";
  }

  // --- CVV ---
  if (typeof body.cvv !== "string") {
    errors.cvv = "El CVV debe ser un texto.";
  } else if (!cvvRegex.test(body.cvv)) {
    errors.cvv = "El CVV debe tener 3 dígitos.";
  }

  // --- CARDHOLDER NAME ---
  if (
    typeof body.cardholder_name !== "string" ||
    body.cardholder_name.trim() === ""
  ) {
    errors.cardholder_name =
      "El nombre del titular de la tarjeta es obligatorio.";
  }

  // --- AMOUNT ---
  const amount = body.amount;

  if (typeof amount !== "number") {
    errors.amount = "El monto debe ser un número.";
  } else if (!Number.isFinite(amount)) {
    errors.amount = "El monto debe ser un número finito.";
  } else if (amount <= 0) {
    errors.amount = "El monto debe ser un número positivo.";
  } else if (amount > 1000000) {
    // Se evalúa el límite antes que la regex para evitar
    // problemas con números grandes en notación científica.
    errors.amount = "El monto excede el límite razonable.";
  } else if (!/^\d+(\.\d{1,2})?$/.test(amount.toString())) {
    errors.amount = "El monto debe tener como máximo 2 decimales.";
  }

  // --- PAYER ID ---
  if (
    typeof body.payer_id !== "string" ||
    body.payer_id.trim() === ""
  ) {
    errors.payer_id = "El ID del pagador es obligatorio.";
  }

  // --- PAYER EMAIL ---
  if (
    typeof body.payer_email !== "string" ||
    body.payer_email.trim() === ""
  ) {
    errors.payer_email =
      "El correo electrónico del pagador es obligatorio.";
  } else if (!EMAIL_REGEX.test(body.payer_email.trim())) {
    errors.payer_email =
      "El correo electrónico del pagador no es válido.";
  }

  // Si hay errores, no se construye un PaymentRequest.
  if (Object.keys(errors).length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  // En este punto las validaciones anteriores garantizan
  // que estos valores tienen los tipos esperados.
  const payment: PaymentRequest = {
    card_number: body.card_number as string,
    expiration_date: body.expiration_date as string,
    cvv: body.cvv as string,
    cardholder_name: (body.cardholder_name as string).trim(),
    amount: body.amount as number,
    payer_id: (body.payer_id as string).trim(),
    payer_email: (body.payer_email as string).trim(),
  };

  return {
    valid: true,
    payment,
  };
}