
import { randomUUID } from "crypto";
import type { PaymentRequest, PaymentResponse } from "./snailpay.types";

const SUCCESS_CARD_NUMBER = "1234123412341234";
const SUCCESS_EXPIRATION_DATE = "12/26";
const SUCCESS_CVV = "543";

function generateReference(): string {
  return `SP-${randomUUID()}`;
}

// Devuelve un valor de texto si existe y es string.
// Si no existe o tiene otro tipo, devuelve "".
function getStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

// Devuelve el monto si es un número válido.
// Si no existe o tiene otro tipo, devuelve 0.
function getAmountValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : 0;
}

// Construye cualquier respuesta que no sea un pago aprobado.
export function buildFailedPayment(
  status: "rejected" | "error",
  statusDetail: string,
  data: Partial<PaymentRequest>
): PaymentResponse {
  return {
    id: randomUUID(),
    status,
    status_detail: statusDetail,
    transaction_amount: getAmountValue(data.amount),
    date_created: new Date().toISOString(),
    authorization_code: null,
    reference: generateReference(),
    payer_id: getStringValue(data.payer_id),
    payer_email: getStringValue(data.payer_email),
    card_number: getStringValue(data.card_number),
    cvv: getStringValue(data.cvv),
  };
}

export function processPayment(data: PaymentRequest): PaymentResponse {
  const isSuccessfulCard =
    data.card_number === SUCCESS_CARD_NUMBER &&
    data.expiration_date === SUCCESS_EXPIRATION_DATE &&
    data.cvv === SUCCESS_CVV;

  if (isSuccessfulCard) {
    return {
      id: randomUUID(),
      date_created: new Date().toISOString(),
      transaction_amount: data.amount,
      payer_id: data.payer_id,
      payer_email: data.payer_email,
      card_number: data.card_number,
      cvv: data.cvv,
      status: "approved",
      status_detail: "accredited",
      authorization_code: `AUTH-${randomUUID()}`,
      reference: generateReference(),
    };
  }

  return buildFailedPayment(
    "rejected",
    "card_declined",
    data
  );
}
