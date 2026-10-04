import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app";
import type { PaymentRequest } from "./snailpay.types";
import {
  expectContract,
  expectContractWithErrors,
  successBody,
} from "./snailpay.fixtures";

const ENDPOINT = "/snailpay/payments";

// Tarjeta bien formada (16 dígitos) que no es la de éxito.
const declinedBody: PaymentRequest = {
  ...successBody,
  card_number: "4111111111111111",
};

// La respuesta debe repetir lo que se envió.
function expectEcho(body: Record<string, unknown>, sent: PaymentRequest) {
  expect(body.card_number).toBe(sent.card_number);
  expect(body.cvv).toBe(sent.cvv);
  expect(body.payer_id).toBe(sent.payer_id);
  expect(body.payer_email).toBe(sent.payer_email);
  expect(body.transaction_amount).toBe(sent.amount);
}

// SNAILPAY_DOWN es una variable global del proceso: si una prueba la activa
// y no se restaura, las demás fallan en cadena.
afterEach(() => {
  delete process.env.SNAILPAY_DOWN;
});

describe("POST /snailpay/payments", () => {
  // --- APROBADO ---

  it("debe responder 200 y approved con los 11 campos del contrato", async () => {
    const res = await request(app).post(ENDPOINT).send(successBody);

    expect(res.status).toBe(200);
    expectContract(res.body);
    expect(res.body.status).toBe("approved");
    expect(res.body.status_detail).toBe("accredited");
    expect(res.body.authorization_code).toMatch(/^AUTH-/);
  });

  it("debe repetir los datos enviados en el 200", async () => {
    const res = await request(app).post(ENDPOINT).send(successBody);

    expect(res.status).toBe(200);
    expectEcho(res.body, successBody);
  });

  // --- RECHAZADO ---

  it("debe responder 402 y card_declined con una tarjeta bien formada distinta", async () => {
    const res = await request(app).post(ENDPOINT).send(declinedBody);

    expect(res.status).toBe(402);
    expectContract(res.body);
    expect(res.body.status).toBe("rejected");
    expect(res.body.status_detail).toBe("card_declined");
    expect(res.body.authorization_code).toBeNull();
  });

  it("debe repetir los datos enviados en el 402", async () => {
    const res = await request(app).post(ENDPOINT).send(declinedBody);

    expect(res.status).toBe(402);
    expectEcho(res.body, declinedBody);
  });

  // --- DATOS INVÁLIDOS ---

  it("debe responder 400 con invalid_data: card_number cuando la tarjeta es \"1234\"", async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .send({ ...successBody, card_number: "1234" });

    expect(res.status).toBe(400);
    expectContractWithErrors(res.body);
    expect(res.body.status).toBe("rejected");
    expect(res.body.status_detail).toBe("invalid_data: card_number");
    expect(res.body.authorization_code).toBeNull();
    expect(res.body.errors).toEqual({
      card_number: "El número de tarjeta debe tener 16 dígitos.",
    });
  });

  it.each([
    ["0", 0],
    ["un número negativo", -5],
  ])("debe responder 400 cuando amount es %s", async (_name, amount) => {
    const res = await request(app)
      .post(ENDPOINT)
      .send({ ...successBody, amount });

    expect(res.status).toBe(400);
    expect(res.body.status_detail).toBe("invalid_data: amount");
    expect(res.body.errors).toHaveProperty(
      "amount",
      "El monto debe ser un número positivo."
    );
  });

  it("debe responder 400 con invalid_data a secas cuando el body es un arreglo", async () => {
    const res = await request(app).post(ENDPOINT).send([]);

    expect(res.status).toBe(400);
    expect(res.body.status_detail).toBe("invalid_data");
    expect(res.body.errors).toEqual({
      general: "El cuerpo de la petición debe ser un objeto válido.",
    });
  });

  // --- SISTEMA CAÍDO ---

  it("debe responder 503 y no aprobar nada cuando SNAILPAY_DOWN es true", async () => {
    process.env.SNAILPAY_DOWN = "true";

    const res = await request(app).post(ENDPOINT).send(successBody);

    expect(res.status).toBe(503);
    expectContract(res.body);
    expect(res.body.status).toBe("error");
    expect(res.body.status_detail).toBe("service_unavailable");
    // Garantía de que no se aplicó ninguna recarga.
    expect(res.body.status).not.toBe("approved");
    expect(res.body.authorization_code).toBeNull();
  });

  it("debe responder 503 (y no 400) con SNAILPAY_DOWN y datos inválidos", async () => {
    // Fija el orden de evaluación: el sistema caído va antes que la validación.
    process.env.SNAILPAY_DOWN = "true";

    const res = await request(app)
      .post(ENDPOINT)
      .send({ ...successBody, card_number: "1234" });

    expect(res.status).toBe(503);
    expect(res.body.status).toBe("error");
    expect(res.body.status_detail).toBe("service_unavailable");
    expect(res.body).not.toHaveProperty("errors");
  });

  it("debe responder 503 y no 500 con SNAILPAY_DOWN y sin cuerpo", async () => {
    // Protege el req.body ?? {} del controlador.
    process.env.SNAILPAY_DOWN = "true";

    const res = await request(app).post(ENDPOINT);

    expect(res.status).toBe(503);
    expectContract(res.body);
    expect(res.body.status).toBe("error");
    expect(res.body.status_detail).toBe("service_unavailable");
    expect(res.body.card_number).toBe("");
    expect(res.body.transaction_amount).toBe(0);
  });

  it("debe volver a funcionar cuando SNAILPAY_DOWN se restaura", async () => {
    process.env.SNAILPAY_DOWN = "true";
    expect(
      (await request(app).post(ENDPOINT).send(successBody)).status
    ).toBe(503);

    delete process.env.SNAILPAY_DOWN;
    expect(
      (await request(app).post(ENDPOINT).send(successBody)).status
    ).toBe(200);
  });

  // --- CUERPO MAL FORMADO O AUSENTE ---

  it("debe responder 400 con solo { error } cuando el JSON está mal formado", async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set("Content-Type", "application/json")
      .send('{"card_number": "1234');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "El cuerpo de la petición contiene JSON inválido.",
    });
    // Esta respuesta queda fuera del contrato de 11 campos.
    expect(res.body).not.toHaveProperty("status");
  });

  it("debe responder 400 con el contrato y errors cuando no hay cuerpo", async () => {
    const res = await request(app).post(ENDPOINT);

    expect(res.status).toBe(400);
    expectContractWithErrors(res.body);
  });
});