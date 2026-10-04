import { describe, expect, it } from "vitest";
import { buildFailedPayment, processPayment } from "./snailpay.service";
import type { PaymentRequest } from "./snailpay.types";
import { expectContract, successBody } from "./snailpay.fixtures";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REFERENCE_REGEX =
  /^SP-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AUTH_CODE_REGEX =
  /^AUTH-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("processPayment", () => {
  // --- APROBADO ---

  it("debe aprobar con approved, accredited y un authorization_code AUTH-", () => {
    const result = processPayment(successBody);

    expectContract(result);
    expect(result.status).toBe("approved");
    expect(result.status_detail).toBe("accredited");
    expect(result.authorization_code).toMatch(/^AUTH-/);
  });

  it("debe seguir aprobando con otro nombre y otro monto", () => {
    const result = processPayment({
      ...successBody,
      cardholder_name: "Otra Persona",
      amount: 999.99,
    });

    expect(result.status).toBe("approved");
    expect(result.status_detail).toBe("accredited");
    expect(result.transaction_amount).toBe(999.99);
  });

  // --- RECHAZADO ---

  it("debe rechazar los datos de éxito con otro CVV", () => {
    const result = processPayment({ ...successBody, cvv: "999" });

    expectContract(result);
    expect(result.status).toBe("rejected");
    expect(result.status_detail).toBe("card_declined");
    expect(result.authorization_code).toBeNull();
  });

  it("debe rechazar los datos de éxito con otra fecha de vencimiento", () => {
    const result = processPayment({ ...successBody, expiration_date: "01/30" });

    expectContract(result);
    expect(result.status).toBe("rejected");
    expect(result.status_detail).toBe("card_declined");
    expect(result.authorization_code).toBeNull();
  });

  it("debe rechazar una tarjeta bien formada que no es la de éxito", () => {
    const result = processPayment({
      ...successBody,
      card_number: "4111111111111111",
    });

    expectContract(result);
    expect(result.status).toBe("rejected");
    expect(result.status_detail).toBe("card_declined");
    expect(result.authorization_code).toBeNull();
  });

  // --- ECO DE DATOS ---

  it("debe repetir los datos enviados en un pago aprobado", () => {
    const result = processPayment(successBody);

    expect(result.card_number).toBe(successBody.card_number);
    expect(result.cvv).toBe(successBody.cvv);
    expect(result.payer_id).toBe(successBody.payer_id);
    expect(result.payer_email).toBe(successBody.payer_email);
    expect(result.transaction_amount).toBe(successBody.amount);
  });

  it("debe repetir los datos enviados en un pago rechazado", () => {
    const rejectedBody = { ...successBody, cvv: "999" };
    const result = processPayment(rejectedBody);

    expect(result.card_number).toBe(rejectedBody.card_number);
    expect(result.cvv).toBe(rejectedBody.cvv);
    expect(result.payer_id).toBe(successBody.payer_id);
    expect(result.payer_email).toBe(successBody.payer_email);
    expect(result.transaction_amount).toBe(successBody.amount);
  });

  // --- VALORES ALEATORIOS Y FECHA ---

  it("debe generar id, reference y authorization_code con el formato esperado", () => {
    const result = processPayment(successBody);

    expect(result.id).toMatch(UUID_REGEX);
    expect(result.reference).toMatch(REFERENCE_REGEX);
    expect(result.authorization_code).toMatch(AUTH_CODE_REGEX);
  });

  it("debe generar valores distintos en dos llamadas", () => {
    const first = processPayment(successBody);
    const second = processPayment(successBody);

    expect(first.id).not.toBe(second.id);
    expect(first.reference).not.toBe(second.reference);
    expect(first.authorization_code).not.toBe(second.authorization_code);
  });

  it("debe devolver date_created como fecha ISO válida", () => {
    const result = processPayment(successBody);

    expect(new Date(result.date_created).toISOString()).toBe(result.date_created);
  });
});

describe("buildFailedPayment", () => {
  it.each([["rejected" as const], ["error" as const]])(
    "debe construir una respuesta con el status %s y el contrato completo",
    (status) => {
      const result = buildFailedPayment(status, "algun_detalle", successBody);

      expectContract(result);
      expect(result.status).toBe(status);
      expect(result.status_detail).toBe("algun_detalle");
      expect(result.authorization_code).toBeNull();
    }
  );

  it("debe devolver \"\" y 0 con un objeto vacío, sin lanzar errores", () => {
    const result = buildFailedPayment("error", "service_unavailable", {});

    expectContract(result);
    expect(result.payer_id).toBe("");
    expect(result.payer_email).toBe("");
    expect(result.card_number).toBe("");
    expect(result.cvv).toBe("");
    expect(result.transaction_amount).toBe(0);
  });

  it("debe devolver \"\" y 0 con datos de tipo equivocado, sin lanzar errores", () => {
    const wrongTypes = {
      card_number: 1234,
      cvv: 543,
      payer_id: null,
      payer_email: ["correo@example.com"],
      amount: "100",
    } as unknown as Partial<PaymentRequest>;

    expect(() =>
      buildFailedPayment("rejected", "card_declined", wrongTypes)
    ).not.toThrow();

    const result = buildFailedPayment("rejected", "card_declined", wrongTypes);

    expect(result.card_number).toBe("");
    expect(result.cvv).toBe("");
    expect(result.payer_id).toBe("");
    expect(result.payer_email).toBe("");
    expect(result.transaction_amount).toBe(0);
  });

  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
  ])("debe devolver 0 cuando amount es %s", (_name, amount) => {
    const result = buildFailedPayment("error", "service_unavailable", { amount });

    expect(result.transaction_amount).toBe(0);
  });

  it("debe conservar los datos válidos que sí vienen en el body", () => {
    const result = buildFailedPayment("rejected", "card_declined", {
      payer_id: "payer-123",
      payer_email: "giselle@example.com",
      amount: 50,
    });

    expect(result.payer_id).toBe("payer-123");
    expect(result.payer_email).toBe("giselle@example.com");
    expect(result.transaction_amount).toBe(50);
  });

  it("debe generar id y reference con el formato esperado y distintos entre llamadas", () => {
    const first = buildFailedPayment("error", "service_unavailable", {});
    const second = buildFailedPayment("error", "service_unavailable", {});

    expect(first.id).toMatch(UUID_REGEX);
    expect(first.reference).toMatch(REFERENCE_REGEX);
    expect(first.id).not.toBe(second.id);
    expect(first.reference).not.toBe(second.reference);
  });
});