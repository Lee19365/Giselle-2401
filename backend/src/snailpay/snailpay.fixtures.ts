import { expect } from "vitest";
import type { PaymentRequest } from "./snailpay.types";

// Los 11 campos del contrato de respuesta. Si alguien añade o quita
// un campo por error, las pruebas que usan estos helpers fallan.
export const CONTRACT_FIELDS = [
  "id",
  "status",
  "status_detail",
  "transaction_amount",
  "date_created",
  "authorization_code",
  "reference",
  "payer_id",
  "payer_email",
  "card_number",
  "cvv",
];

// Datos que el servicio aprueba (tarjeta, vencimiento y CVV de éxito).
export const successBody: PaymentRequest = {
  card_number: "1234123412341234",
  expiration_date: "12/26",
  cvv: "543",
  cardholder_name: "Giselle Aceves",
  amount: 100.5,
  payer_id: "payer-123",
  payer_email: "giselle@example.com",
};

// La respuesta tiene exactamente los 11 campos del contrato.
export function expectContract(body: object) {
  expect(Object.keys(body).sort()).toEqual([...CONTRACT_FIELDS].sort());
}

// Igual, pero con el campo extra "errors" de las respuestas 400.
export function expectContractWithErrors(body: object) {
  expect(Object.keys(body).sort()).toEqual(
    [...CONTRACT_FIELDS, "errors"].sort()
  );
}