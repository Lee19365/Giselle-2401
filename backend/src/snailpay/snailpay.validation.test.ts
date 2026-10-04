import { describe, expect, it } from "vitest";
import { validatePayment } from "./snailpay.validation";
import type { PaymentRequest } from "./snailpay.types";

const validBody: PaymentRequest = {
  card_number: "1234567890123456",
  expiration_date: "12/26",
  cvv: "123",
  cardholder_name: "Giselle Aceves",
  amount: 100.5,
  payer_id: "payer-123",
  payer_email: "giselle@example.com",
};

// Lee los errores de un resultado fallido. Si la validación fue exitosa,
// la prueba falla con un mensaje claro y TypeScript deja acceder a "errors".
function getErrors(result: ReturnType<typeof validatePayment>) {
  if (result.valid) {
    throw new Error("Se esperaba una validación fallida");
  }
  return result.errors;
}

// Copia del body válido sin un campo, para probar campos ausentes.
function withoutField(field: keyof PaymentRequest) {
  const body: Partial<PaymentRequest> = { ...validBody };
  delete body[field];
  return body;
}

describe("validatePayment", () => {
  // --- BODY GENERAL ---

  it("debe devolver valid: true y el pago cuando el body es válido", () => {
    const result = validatePayment(validBody);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payment).toEqual(validBody);
    }
  });

  it.each([
    ["null", null],
    ["un texto", "texto"],
    ["un número", 42],
    ["un arreglo", []],
  ])("debe devolver solo el error general cuando el body es %s", (_name, body) => {
    expect(getErrors(validatePayment(body))).toEqual({
      general: "El cuerpo de la petición debe ser un objeto válido.",
    });
  });

  // --- CARD NUMBER ---

  it("debe devolver error cuando card_number está ausente", () => {
    expect(getErrors(validatePayment(withoutField("card_number")))).toHaveProperty(
      "card_number",
      "El número de tarjeta debe ser un texto."
    );
  });

  it("debe devolver error cuando card_number no es texto", () => {
    const result = validatePayment({ ...validBody, card_number: 1234567890123456 });

    expect(getErrors(result)).toHaveProperty(
      "card_number",
      "El número de tarjeta debe ser un texto."
    );
  });

  it.each([
    ["15 dígitos", "123456789012345"],
    ["17 dígitos", "12345678901234567"],
    ["letras", "123456789012345a"],
    ["guiones", "1234-5678-9012-3456"],
    ["espacios", "1234 5678 9012 3456"],
  ])("debe devolver error cuando card_number tiene %s", (_name, cardNumber) => {
    const result = validatePayment({ ...validBody, card_number: cardNumber });

    expect(getErrors(result)).toHaveProperty(
      "card_number",
      "El número de tarjeta debe tener 16 dígitos."
    );
  });

  // --- EXPIRATION DATE ---

  it("debe devolver error cuando expiration_date está ausente", () => {
    expect(getErrors(validatePayment(withoutField("expiration_date")))).toHaveProperty(
      "expiration_date",
      "La fecha de vencimiento debe ser un texto."
    );
  });

  it("debe devolver error cuando expiration_date no es texto", () => {
    const result = validatePayment({ ...validBody, expiration_date: 1226 });

    expect(getErrors(result)).toHaveProperty(
      "expiration_date",
      "La fecha de vencimiento debe ser un texto."
    );
  });

  it.each([
    ["mes 00", "00/26"],
    ["mes 13", "13/26"],
    ["mes de un solo dígito", "1/26"],
    ["sin separador", "1226"],
    ["año de 4 dígitos", "12/2026"],
  ])("debe devolver error cuando expiration_date tiene %s", (_name, date) => {
    const result = validatePayment({ ...validBody, expiration_date: date });

    expect(getErrors(result)).toHaveProperty(
      "expiration_date",
      "La fecha de vencimiento debe tener el formato MM/YY."
    );
  });

  // --- CVV ---

  it("debe devolver error cuando cvv está ausente", () => {
    expect(getErrors(validatePayment(withoutField("cvv")))).toHaveProperty(
      "cvv",
      "El CVV debe ser un texto."
    );
  });

  it("debe devolver error cuando cvv no es texto", () => {
    const result = validatePayment({ ...validBody, cvv: 123 });

    expect(getErrors(result)).toHaveProperty("cvv", "El CVV debe ser un texto.");
  });

  it.each([
    ["2 dígitos", "12"],
    ["4 dígitos", "1234"],
  ])("debe devolver error cuando cvv tiene %s", (_name, cvv) => {
    const result = validatePayment({ ...validBody, cvv });

    expect(getErrors(result)).toHaveProperty("cvv", "El CVV debe tener 3 dígitos.");
  });

  // --- CARDHOLDER NAME ---

  it("debe devolver error cuando cardholder_name está ausente", () => {
    expect(getErrors(validatePayment(withoutField("cardholder_name")))).toHaveProperty(
      "cardholder_name",
      "El nombre del titular de la tarjeta es obligatorio."
    );
  });

  it("debe devolver error cuando cardholder_name no es texto", () => {
    const result = validatePayment({ ...validBody, cardholder_name: 123 });

    expect(getErrors(result)).toHaveProperty(
      "cardholder_name",
      "El nombre del titular de la tarjeta es obligatorio."
    );
  });

  it("debe devolver error cuando cardholder_name está vacío", () => {
    const result = validatePayment({ ...validBody, cardholder_name: "" });

    expect(getErrors(result)).toHaveProperty(
      "cardholder_name",
      "El nombre del titular de la tarjeta es obligatorio."
    );
  });

  // --- AMOUNT ---

  it("debe devolver error cuando amount está ausente", () => {
    expect(getErrors(validatePayment(withoutField("amount")))).toHaveProperty(
      "amount",
      "El monto debe ser un número."
    );
  });

  it("debe devolver error cuando amount no es un número", () => {
    const result = validatePayment({ ...validBody, amount: "100" });

    expect(getErrors(result)).toHaveProperty("amount", "El monto debe ser un número.");
  });

  it.each([
    ["0", 0],
    ["un número negativo", -100],
  ])("debe devolver error cuando amount es %s", (_name, amount) => {
    const result = validatePayment({ ...validBody, amount });

    expect(getErrors(result)).toHaveProperty(
      "amount",
      "El monto debe ser un número positivo."
    );
  });

  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
  ])("debe devolver error cuando amount es %s", (_name, amount) => {
    const result = validatePayment({ ...validBody, amount });

    expect(getErrors(result).amount).toBeDefined();
  });

  it("debe devolver error cuando amount tiene más de 2 decimales", () => {
    const result = validatePayment({ ...validBody, amount: 100.555 });

    expect(getErrors(result)).toHaveProperty(
      "amount",
      "El monto debe tener como máximo 2 decimales."
    );
  });

  it.each([
    ["supera el límite", 1000001],
    ["está en notación científica", 1e21],
  ])("debe devolver error cuando amount %s", (_name, amount) => {
    const result = validatePayment({ ...validBody, amount });

    expect(getErrors(result)).toHaveProperty(
      "amount",
      "El monto excede el límite razonable."
    );
  });

  it.each([0.01, 10.99, 100.55, 1000000])(
    "debe aceptar un amount válido: %s",
    (amount) => {
      const result = validatePayment({ ...validBody, amount });

      expect(result.valid).toBe(true);
    }
  );

  // --- PAYER ID ---

  it("debe devolver error cuando payer_id está ausente", () => {
    expect(getErrors(validatePayment(withoutField("payer_id")))).toHaveProperty(
      "payer_id",
      "El ID del pagador es obligatorio."
    );
  });

  it("debe devolver error cuando payer_id no es texto", () => {
    const result = validatePayment({ ...validBody, payer_id: 123 });

    expect(getErrors(result)).toHaveProperty(
      "payer_id",
      "El ID del pagador es obligatorio."
    );
  });

  it("debe devolver error cuando payer_id está vacío", () => {
    const result = validatePayment({ ...validBody, payer_id: "" });

    expect(getErrors(result)).toHaveProperty(
      "payer_id",
      "El ID del pagador es obligatorio."
    );
  });

  // --- PAYER EMAIL ---

  it("debe devolver error cuando payer_email está ausente", () => {
    expect(getErrors(validatePayment(withoutField("payer_email")))).toHaveProperty(
      "payer_email",
      "El correo electrónico del pagador es obligatorio."
    );
  });

  it("debe devolver error cuando payer_email no es texto", () => {
    const result = validatePayment({ ...validBody, payer_email: 123 });

    expect(getErrors(result)).toHaveProperty(
      "payer_email",
      "El correo electrónico del pagador es obligatorio."
    );
  });

  it.each([
    ["sin @", "correo-invalido"],
    ["sin dominio", "usuario@"],
    ["sin usuario", "@example.com"],
    ["con espacios", "usuario example.com"],
  ])("debe devolver error cuando payer_email está %s", (_name, email) => {
    const result = validatePayment({ ...validBody, payer_email: email });

    expect(getErrors(result)).toHaveProperty(
      "payer_email",
      "El correo electrónico del pagador no es válido."
    );
  });

  it("debe aceptar un payer_email válido", () => {
    const result = validatePayment({ ...validBody, payer_email: "usuario@example.com" });

    expect(result.valid).toBe(true);
  });

  // --- MULTIPLE ERRORS ---

  it("debe devolver todos los errores cuando varios campos son inválidos", () => {
    const result = validatePayment({
      ...validBody,
      card_number: "123",
      expiration_date: "13/26",
      cvv: "12",
      cardholder_name: "",
      amount: 0,
      payer_id: "",
      payer_email: "correo-invalido",
    });

    expect(getErrors(result)).toEqual({
      card_number: "El número de tarjeta debe tener 16 dígitos.",
      expiration_date: "La fecha de vencimiento debe tener el formato MM/YY.",
      cvv: "El CVV debe tener 3 dígitos.",
      cardholder_name: "El nombre del titular de la tarjeta es obligatorio.",
      amount: "El monto debe ser un número positivo.",
      payer_id: "El ID del pagador es obligatorio.",
      payer_email: "El correo electrónico del pagador no es válido.",
    });
  });

  it("debe marcar todos los campos como erróneos cuando el body es un objeto vacío", () => {
    const errors = getErrors(validatePayment({}));

    expect(Object.keys(errors).sort()).toEqual(
      [
        "amount",
        "card_number",
        "cardholder_name",
        "cvv",
        "expiration_date",
        "payer_email",
        "payer_id",
      ].sort()
    );
  });
});