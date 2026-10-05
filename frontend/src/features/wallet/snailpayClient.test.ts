import { afterEach, describe, expect, it, vi } from "vitest";
import { createPayment } from "./snailpayClient";
import type { PaymentResult } from "./snailpayClient";
import type { PaymentRequest, PaymentResponse } from "./wallet.types";

const requestBody: PaymentRequest = {
  card_number: "1234123412341234",
  expiration_date: "12/26",
  cvv: "543",
  cardholder_name: "Giselle Aceves",
  amount: 100.5,
  payer_id: "payer-123",
  payer_email: "giselle@example.com",
};

// Respuesta válida y coherente con requestBody; cada prueba cambia lo que necesita.
function paymentResponse(
  overrides: Partial<PaymentResponse> = {},
): PaymentResponse {
  return {
    id: "e3f19f8e-c2fe-4014-b515-f9a25347e57e",
    status: "approved",
    status_detail: "accredited",
    transaction_amount: requestBody.amount,
    date_created: "2026-10-04T21:01:52.007Z",
    authorization_code: "AUTH-b481640d-2a75-4e97-9dd6-a01616b95a45",
    reference: "SP-d0be42f6-9ff8-43eb-bb7c-4715c30813c8",
    payer_id: requestBody.payer_id,
    payer_email: requestBody.payer_email,
    card_number: requestBody.card_number,
    cvv: requestBody.cvv,
    ...overrides,
  };
}

const declinedResponse = () =>
  paymentResponse({
    status: "rejected",
    status_detail: "card_declined",
    authorization_code: null,
  });

const unavailableResponse = () =>
  paymentResponse({
    status: "error",
    status_detail: "service_unavailable",
    authorization_code: null,
  });

// El cliente solo lee dos cosas de la respuesta: status y json().
function mockFetchResponse(status: number, body: unknown) {
  const fetchMock = vi
    .fn()
    .mockResolvedValue({ status, json: async () => body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function stubFetchThatFails() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
  );
}

function stubFetchWithInvalidJson() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON");
      },
    }),
  );
}

// Un fetch que nunca responde, pero que rechaza al abortarse la señal,
// que es lo que hace el fetch real. Sin esto, la prueba se colgaría.
function stubFetchThatNeverResponds() {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    ),
  );
}

// Responde los encabezados, pero el cuerpo nunca llega: rechaza al abortar.
function stubFetchWithStalledBody() {
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, init?: RequestInit) =>
      Promise.resolve({
        status: 200,
        json: () =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      }),
    ),
  );
}

// Comprueba el kind y devuelve el resultado ya acotado para leer sus campos.
function expectKind<K extends PaymentResult["kind"]>(
  result: PaymentResult,
  kind: K,
): Extract<PaymentResult, { kind: K }> {
  expect(result.kind).toBe(kind);
  return result as Extract<PaymentResult, { kind: K }>;
}

// Copia del objeto sin una clave, para probar campos ausentes.
function omit<T extends object>(obj: T, key: keyof T) {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key));
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("createPayment", () => {
  // --- PETICIÓN ---

  it("debe enviar un POST JSON al endpoint con el cuerpo recibido", async () => {
    const fetchMock = mockFetchResponse(200, paymentResponse());

    await createPayment(requestBody);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/snailpay/payments");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual(requestBody);
  });

  // --- APROBADO ---

  it("debe devolver approved con el pago y un mensaje con la referencia", async () => {
    const payment = paymentResponse();
    mockFetchResponse(200, payment);

    const result = expectKind(await createPayment(requestBody), "approved");

    expect(result.payment).toEqual(payment);
    expect(result.message).toContain(payment.reference);
  });

  it("debe aprobar aunque payer_id y payer_email se envíen con espacios", async () => {
    // El backend los recorta (trim) antes de repetirlos.
    mockFetchResponse(200, paymentResponse());

    const result = await createPayment({
      ...requestBody,
      payer_id: `  ${requestBody.payer_id} `,
      payer_email: ` ${requestBody.payer_email}  `,
    });

    expect(result.kind).toBe("approved");
  });

  it.each([
    ["el monto", { transaction_amount: 5000 }],
    ["el payer_id", { payer_id: "payer-999" }],
    ["el payer_email", { payer_email: "otra@example.com" }],
  ])(
    "debe devolver invalid-response si el 200 aprobado cambia %s",
    async (_name, override) => {
      mockFetchResponse(200, paymentResponse(override));

      const result = await createPayment(requestBody);

      expect(result.kind).toBe("invalid-response");
    },
  );

  it("debe devolver invalid-response si el 200 aprobado no trae authorization_code", async () => {
    mockFetchResponse(200, paymentResponse({ authorization_code: null }));

    const result = await createPayment(requestBody);

    expect(result.kind).toBe("invalid-response");
  });

  it("debe devolver invalid-response si el 200 trae status rejected", async () => {
    mockFetchResponse(200, declinedResponse());

    const result = await createPayment(requestBody);

    expect(result.kind).toBe("invalid-response");
  });

  // --- RECHAZADO ---

  it("debe devolver rejected con card_declined en un 402", async () => {
    mockFetchResponse(402, declinedResponse());

    const result = expectKind(await createPayment(requestBody), "rejected");

    expect(result.reason).toBe("card_declined");
    expect(result.fieldErrors).toEqual({});
    expect(result.message).not.toBe("");
  });

  it("debe devolver rejected con invalid_data y los fieldErrors en un 400", async () => {
    mockFetchResponse(400, {
      ...paymentResponse({
        status: "rejected",
        status_detail: "invalid_data: card_number",
        authorization_code: null,
      }),
      errors: { card_number: "El número de tarjeta debe tener 16 dígitos." },
    });

    const result = expectKind(await createPayment(requestBody), "rejected");

    expect(result.reason).toBe("invalid_data");
    expect(result.fieldErrors).toEqual({
      card_number: "El número de tarjeta debe tener 16 dígitos.",
    });
  });

  it("debe descartar el error general y lo que no sea texto en fieldErrors", async () => {
    mockFetchResponse(400, {
      ...paymentResponse({
        status: "rejected",
        status_detail: "invalid_data",
        authorization_code: null,
      }),
      errors: {
        general: "El cuerpo de la petición debe ser un objeto válido.",
        cvv: "El CVV debe tener 3 dígitos.",
        amount: 123,
      },
    });

    const result = expectKind(await createPayment(requestBody), "rejected");

    expect(result.fieldErrors).toEqual({
      cvv: "El CVV debe tener 3 dígitos.",
    });
  });

  it("debe devolver fieldErrors vacío en un 400 sin campo errors", async () => {
    mockFetchResponse(400, declinedResponse());

    const result = expectKind(await createPayment(requestBody), "rejected");

    expect(result.fieldErrors).toEqual({});
  });

  // --- SISTEMA CAÍDO ---

  it("debe devolver unavailable en un 503", async () => {
    mockFetchResponse(503, unavailableResponse());

    const result = expectKind(await createPayment(requestBody), "unavailable");

    expect(result.message).not.toBe("");
  });

  // --- INCOHERENCIAS ENTRE CÓDIGO HTTP Y status ---

  it.each([
    ["503 con approved", 503, paymentResponse()],
    ["402 con approved", 402, paymentResponse()],
    ["400 con approved", 400, paymentResponse()],
    ["400 con error", 400, unavailableResponse()],
    ["402 con error", 402, unavailableResponse()],
    ["503 con rejected", 503, declinedResponse()],
    ["un 201", 201, paymentResponse()],
  ])("debe devolver invalid-response con %s", async (_name, status, body) => {
    mockFetchResponse(status, body);

    const result = await createPayment(requestBody);

    expect(result.kind).toBe("invalid-response");
  });

  // --- RESPUESTAS QUE NO SON DEL CONTRATO ---

  it.each([
    ["un 400 con { error } (JSON mal formado)", 400],
    ["un 500 con { error }", 500],
  ])("debe devolver invalid-response con %s", async (_name, status) => {
    mockFetchResponse(status, {
      error: "El cuerpo de la petición contiene JSON inválido.",
    });

    const result = await createPayment(requestBody);

    expect(result.kind).toBe("invalid-response");
  });

  it("debe devolver invalid-response en un 500 aunque el cuerpo tenga la forma del contrato", async () => {
    mockFetchResponse(500, unavailableResponse());

    const result = await createPayment(requestBody);

    expect(result.kind).toBe("invalid-response");
  });

  it.each([
    ["null", null],
    ["un arreglo", []],
    ["un texto", "texto"],
    ["un objeto vacío", {}],
    ["sin el campo cvv", omit(paymentResponse(), "cvv")],
    ["un status desconocido", { ...paymentResponse(), status: "pending" }],
    [
      "un monto que no es número",
      { ...paymentResponse(), transaction_amount: "100" },
    ],
    [
      "un authorization_code de otro tipo",
      { ...paymentResponse(), authorization_code: 123 },
    ],
  ])(
    "debe devolver invalid-response cuando el cuerpo es %s",
    async (_name, body) => {
      mockFetchResponse(200, body);

      const result = await createPayment(requestBody);

      expect(result.kind).toBe("invalid-response");
    },
  );

  // --- FALLOS DE RED Y CUERPO ---

  it("debe devolver network-error cuando fetch falla", async () => {
    stubFetchThatFails();

    const result = expectKind(
      await createPayment(requestBody),
      "network-error",
    );

    expect(result.message).not.toBe("");
  });

  it("debe devolver invalid-response cuando el cuerpo no es JSON", async () => {
    stubFetchWithInvalidJson();

    const result = await createPayment(requestBody);

    expect(result.kind).toBe("invalid-response");
  });

  // --- TIMEOUT ---

  it("debe devolver timeout cuando el servidor no responde a tiempo", async () => {
    vi.useFakeTimers();
    stubFetchThatNeverResponds();

    const promise = createPayment(requestBody, { timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);

    const result = expectKind(await promise, "timeout");
    expect(result.message).toContain("Tu saldo no se modificó");
  });

  it("debe devolver timeout cuando el cuerpo de la respuesta no termina de llegar", async () => {
    vi.useFakeTimers();
    stubFetchWithStalledBody();

    const promise = createPayment(requestBody, { timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toMatchObject({ kind: "timeout" });
  });

  it("no debe dar timeout antes de que se cumpla el tiempo", async () => {
    vi.useFakeTimers();
    stubFetchThatNeverResponds();

    let settled = false;
    const promise = createPayment(requestBody, { timeoutMs: 1000 }).then(
      (result) => {
        settled = true;
        return result;
      },
    );

    await vi.advanceTimersByTimeAsync(999);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toMatchObject({ kind: "timeout" });
  });

  // --- LIMPIEZA DEL TIMER ---

  it.each([
    ["una respuesta aprobada", () => mockFetchResponse(200, paymentResponse())],
    ["un error de red", stubFetchThatFails],
    ["un cuerpo que no es JSON", stubFetchWithInvalidJson],
  ])("debe dejar el timer limpio tras %s", async (_name, setup) => {
    vi.useFakeTimers();
    setup();

    await createPayment(requestBody);

    expect(vi.getTimerCount()).toBe(0);
  });

  it("debe dejar el timer limpio tras un timeout", async () => {
    vi.useFakeTimers();
    stubFetchThatNeverResponds();

    const promise = createPayment(requestBody, { timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);
    await promise;

    expect(vi.getTimerCount()).toBe(0);
  });
});
