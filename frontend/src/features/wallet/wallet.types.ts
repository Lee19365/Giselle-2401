// Tipos de SnailPay en el frontend.
// Se duplican a propósito respecto al backend (backend/src/snailpay/snailpay.types.ts):
// el frontend no importa código del backend, y el cliente valida la forma de la
// respuesta en tiempo de ejecución antes de confiar en ella.

export interface PaymentRequest {
  card_number: string;
  expiration_date: string;
  cvv: string;
  cardholder_name: string;
  amount: number;
  payer_id: string;
  payer_email: string;
}

// Única fuente de los estados conocidos: el tipo y la validación en tiempo
// de ejecución salen de esta constante, así que no pueden desincronizarse.
export const PAYMENT_STATUSES = ["approved", "rejected", "error"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// Los 11 campos del contrato de respuesta.
// Ojo: por contrato incluye card_number y cvv. No guardes ni muestres este
// objeto, ni lo registres en consola; tarjeta y CVV solo se guardan en el
// store de la billetera, por requisito de la prueba y por ser datos ficticios.
export interface PaymentResponse {
  id: string;
  status: PaymentStatus;
  status_detail: string;
  transaction_amount: number;
  date_created: string;
  authorization_code: string | null;
  reference: string;
  payer_id: string;
  payer_email: string;
  card_number: string;
  cvv: string;
}