import { describe, expect, it } from "vitest";
import {
  mapServerErrors,
  parseAmount,
  validateTopUpForm,
} from "./topUpForm.validation";
import type { TopUpFormValues } from "./topUpForm.validation";

const validValues: TopUpFormValues = {
  cardNumber: "1234123412341234",
  expirationDate: "12/26",
  cvv: "543",
  cardholderName: "Giselle Aceves",
  amount: "100.50",
};

describe("parseAmount", () => {
  it.each([
    ["100", 100],
    ["100.5", 100.5],
    ["100.50", 100.5],
    ["0.01", 0.01],
    [" 25 ", 25],
    ["150.50", 150.5],
    [" 150.50 ", 150.5],
  ])("debe convertir %j a %s", (text, expected) => {
    expect(parseAmount(text)).toBe(expected);
  });

  it.each([
    ["vacío", ""],
    ["solo espacios", "   "],
    ["notación científica", "1e3"],
    ["coma como separador de miles", "1,000"],
    ["coma decimal", "1,5"],
    ["espacio en medio", "1 000"],
    ["negativo", "-5"],
    ["signo más", "+5"],
    ["3 decimales", "10.555"],
    ["sin dígito antes del punto", ".5"],
    ["punto sin decimales", "1."],
    ["letras", "abc"],
    ["hexadecimal", "0x10"],
    ["punto final sin decimales", "5."],
    ["3 decimales exactos", "1.234"],
  ])("debe devolver null cuando el texto es %s", (_name, text) => {
    expect(parseAmount(text)).toBeNull();
  });
});

describe("validateTopUpForm", () => {
  it("debe devolver cero errores con datos válidos", () => {
    expect(validateTopUpForm(validValues)).toEqual({});
  });

  it("debe aceptar el monto máximo", () => {
    expect(
      validateTopUpForm({ ...validValues, amount: "1000000" })
    ).toEqual({});
  });

  it.each([
    ["con espacios", "1234 1234 1234 1234"],
    ["con guiones", "1234-1234-1234-1234"],
  ])("debe aceptar una tarjeta %s", (_name, cardNumber) => {
    expect(validateTopUpForm({ ...validValues, cardNumber })).toEqual({});
  });

  it.each([
    ["cardNumber", { cardNumber: "123456789012345" }],
    ["cardNumber", { cardNumber: "123456789012345a" }],
    ["expirationDate", { expirationDate: "13/26" }],
    ["expirationDate", { expirationDate: "1226" }],
    ["cvv", { cvv: "12" }],
    ["cvv", { cvv: "1234" }],
    ["cardholderName", { cardholderName: "   " }],
    ["amount", { amount: "" }],
    ["amount", { amount: "0" }],
    ["amount", { amount: "1e3" }],
    ["amount", { amount: "1000001" }],
  ])("debe marcar solo %s con %j", (field, override) => {
    const errors = validateTopUpForm({ ...validValues, ...override });

    expect(Object.keys(errors)).toEqual([field]);
  });

  it("debe marcar todos los campos cuando todo está vacío", () => {
    const errors = validateTopUpForm({
      cardNumber: "",
      expirationDate: "",
      cvv: "",
      cardholderName: "",
      amount: "",
    });

    expect(Object.keys(errors).sort()).toEqual(
      ["amount", "cardNumber", "cardholderName", "cvv", "expirationDate"].sort()
    );
  });
});

describe("mapServerErrors", () => {
  it("debe traducir los nombres del backend a los del formulario", () => {
    const errors = mapServerErrors({
      card_number: "Mensaje tarjeta",
      expiration_date: "Mensaje fecha",
      cvv: "Mensaje cvv",
      cardholder_name: "Mensaje nombre",
      amount: "Mensaje monto",
    });

    expect(errors).toEqual({
      cardNumber: "Mensaje tarjeta",
      expirationDate: "Mensaje fecha",
      cvv: "Mensaje cvv",
      cardholderName: "Mensaje nombre",
      amount: "Mensaje monto",
    });
  });

  it("debe ignorar los campos que el formulario no tiene", () => {
    const errors = mapServerErrors({
      payer_id: "El ID del pagador es obligatorio.",
      payer_email: "El correo no es válido.",
      constructor: "no debe coincidir por herencia",
    });

    expect(errors).toEqual({});
  });
});
