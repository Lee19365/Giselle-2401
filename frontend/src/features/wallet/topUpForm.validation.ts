// Lógica pura del formulario de recarga: validación, conversión del monto y
// traducción de los nombres del backend a los del formulario.
// La validación del cliente es solo para dar respuesta inmediata: la autoridad
// es el backend, y estas reglas deben mantenerse alineadas con las suyas.

export interface TopUpFormValues {
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  cardholderName: string;
  // Texto tal cual lo escribe el usuario; se convierte con parseAmount.
  amount: string;
}

export type TopUpFormErrors = Partial<Record<keyof TopUpFormValues, string>>;

const MAX_AMOUNT = 1_000_000;
const CARD_NUMBER_REGEX = /^\d{16}$/;
const EXPIRATION_DATE_REGEX = /^(0[1-9]|1[0-2])\/\d{2}$/;
const CVV_REGEX = /^\d{3}$/;
// Solo dígitos y, opcionalmente, punto con 1 o 2 decimales. Sin comas,
// espacios, signos ni notación científica: así "1,000" o "1e3" nunca se
// interpretan en silencio como otro monto.
const AMOUNT_REGEX = /^\d+(\.\d{1,2})?$/;

// Devuelve el monto como número, o null si el texto no es un monto válido.
// Number("") da 0 y Number("1e3") da 1000, por eso se valida primero el texto.
export function parseAmount(text: string): number | null {
  const trimmed = text.trim();

  if (!AMOUNT_REGEX.test(trimmed)) {
    return null;
  }

  return Number(trimmed);
}

export function validateTopUpForm(values: TopUpFormValues): TopUpFormErrors {
  const errors: TopUpFormErrors = {};

  // El número puede escribirse con espacios o guiones; la billetera los
  // quita antes de enviarlo, así que aquí se cuentan solo los dígitos.
  if (!CARD_NUMBER_REGEX.test(values.cardNumber.replace(/[\s-]/g, ""))) {
    errors.cardNumber = "El número de tarjeta debe tener 16 dígitos.";
  }

  // Igual que el backend: solo se valida el formato, no la vigencia.
  if (!EXPIRATION_DATE_REGEX.test(values.expirationDate.trim())) {
    errors.expirationDate =
      "La fecha de vencimiento debe tener el formato MM/YY.";
  }

  if (!CVV_REGEX.test(values.cvv.trim())) {
    errors.cvv = "El CVV debe tener 3 dígitos.";
  }

  if (values.cardholderName.trim() === "") {
    errors.cardholderName = "El nombre del titular es obligatorio.";
  }

  const amount = parseAmount(values.amount);

  if (values.amount.trim() === "") {
    errors.amount = "Escribe el monto de la recarga.";
  } else if (amount === null) {
    errors.amount =
      "Usa solo números y punto decimal, con máximo 2 decimales. Ejemplo: 150.50.";
  } else if (amount <= 0) {
    errors.amount = "El monto debe ser mayor que cero.";
  } else if (amount > MAX_AMOUNT) {
    errors.amount = "El monto excede el límite permitido.";
  }

  return errors;
}

// Nombres del backend -> nombres del formulario. Es un Map para que claves
// como "constructor" no coincidan por herencia del objeto.
const SERVER_FIELD_MAP = new Map<string, keyof TopUpFormValues>([
  ["card_number", "cardNumber"],
  ["expiration_date", "expirationDate"],
  ["cvv", "cvv"],
  ["cardholder_name", "cardholderName"],
  ["amount", "amount"],
]);

// Los campos sin equivalente en el formulario (payer_id, payer_email) se
// ignoran: el usuario no puede corregirlos, y los cubre el mensaje general.
export function mapServerErrors(
  fieldErrors: Record<string, string>,
): TopUpFormErrors {
  const errors: TopUpFormErrors = {};

  for (const [serverField, message] of Object.entries(fieldErrors)) {
    const formField = SERVER_FIELD_MAP.get(serverField);

    if (formField) {
      errors[formField] = message;
    }
  }

  return errors;
}
