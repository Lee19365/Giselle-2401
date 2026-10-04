export type PaymentStatus = "approved" | "rejected" | "error";

export interface PaymentRequest {
  card_number: string;
  expiration_date: string; // "MM/YY"
  cvv: string;
  cardholder_name: string;
  amount: number;
  payer_id: string;
  payer_email: string;
}

export interface PaymentResponse {
  id: string;
  status: PaymentStatus;
  status_detail: string;
  transaction_amount: number;
  date_created: string; // ISO 8601
  authorization_code: string | null;
  reference: string;
  payer_id: string;
  payer_email: string;
  card_number: string;
  cvv: string;
}