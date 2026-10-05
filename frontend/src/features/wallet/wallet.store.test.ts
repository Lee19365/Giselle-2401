import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPayment } from "./snailpayClient";
import type { PaymentResult } from "./snailpayClient";
import type { PaymentRequest, PaymentResponse } from "./wallet.types";
import { useWalletStore } from "./wallet.store";

vi.mock("./snailpayClient", () => ({ createPayment: vi.fn() }));

const createPaymentMock = vi.mocked(createPayment);

const requestBody: PaymentRequest = {
  card_number: "1234123412341234",
  expiration_date: "12/26",
  cvv: "543",
  cardholder_name: "Giselle Aceves",
  amount: 100.5,
  payer_id: "payer-123",
  payer_email: "giselle@example.com",
};

const INITIAL_STATE = {
  balance: 0,
  cardNumber: "",
  cvv: "",
  isTopUpInProgress: false,
};

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

function approvedResult(amount: number): PaymentResult {
  return {
    kind: "approved",
    message: "Pago aprobado.",
    payment: paymentResponse({ transaction_amount: amount }),
  };
}

// Todo resultado que no sea approved: no debe tocar saldo ni tarjeta.
const notApprovedResults: [string, PaymentResult][] = [
  [
    "rejected por tarjeta rechazada",
    {
      kind: "rejected",
      message: "Tarjeta rechazada.",
      reason: "card_declined",
      payment: paymentResponse({
        status: "rejected",
        status_detail: "card_declined",
        authorization_code: null,
      }),
      fieldErrors: {},
    },
  ],
  [
    "rejected por datos inválidos",
    {
      kind: "rejected",
      message: "Datos inválidos.",
      reason: "invalid_data",
      payment: paymentResponse({
        status: "rejected",
        status_detail: "invalid_data: cvv",
        authorization_code: null,
      }),
      fieldErrors: { cvv: "El CVV debe tener 3 dígitos." },
    },
  ],
  ["unavailable", { kind: "unavailable", message: "Servicio caído." }],
  ["timeout", { kind: "timeout", message: "Tardó demasiado." }],
  [
    "invalid-response",
    { kind: "invalid-response", message: "Respuesta inesperada." },
  ],
  ["network-error", { kind: "network-error", message: "Sin conexión." }],
];

beforeEach(() => {
  createPaymentMock.mockReset();
  useWalletStore.setState(INITIAL_STATE);
});

describe("useWalletStore", () => {
  it("debe empezar con saldo 0, sin tarjeta y sin recarga en curso", () => {
    expect(useWalletStore.getState()).toMatchObject(INITIAL_STATE);
  });

  // --- RECARGA APROBADA ---

  it("debe sumar transaction_amount y guardar tarjeta y CVV cuando se aprueba", async () => {
    createPaymentMock.mockResolvedValue(approvedResult(100.5));

    const result = await useWalletStore.getState().topUp(requestBody);

    expect(result.kind).toBe("approved");
    expect(useWalletStore.getState()).toMatchObject({
      balance: 100.5,
      cardNumber: "1234123412341234",
      cvv: "543",
    });
  });

  it.each([
    [0.1, 0.2, 0.3],
    [1.15, 2.3, 3.45],
    [100.5, 0.01, 100.51],
  ])(
    "debe sumar %s y %s sin errores de punto flotante",
    async (first, second, total) => {
      createPaymentMock
        .mockResolvedValueOnce(approvedResult(first))
        .mockResolvedValueOnce(approvedResult(second));

      await useWalletStore.getState().topUp({ ...requestBody, amount: first });
      await useWalletStore.getState().topUp({ ...requestBody, amount: second });

      expect(useWalletStore.getState().balance).toBe(total);
    },
  );

  // --- RECARGAS NO APROBADAS ---

  it.each(notApprovedResults)(
    "no debe cambiar saldo ni tarjeta cuando el resultado es %s",
    async (_name, notApproved) => {
      createPaymentMock.mockResolvedValue(notApproved);

      const result = await useWalletStore.getState().topUp(requestBody);

      expect(result).toEqual(notApproved);
      expect(useWalletStore.getState()).toMatchObject({
        balance: 0,
        cardNumber: "",
        cvv: "",
      });
    },
  );

  // --- NÚMERO DE TARJETA ---

  it("debe quitar espacios y guiones del número antes de llamar al cliente y de guardarlo", async () => {
    createPaymentMock.mockResolvedValue(approvedResult(100.5));

    await useWalletStore
      .getState()
      .topUp({ ...requestBody, card_number: "1234 5678-9012 3456" });

    expect(createPaymentMock).toHaveBeenCalledWith({
      ...requestBody,
      card_number: "1234567890123456",
    });
    expect(useWalletStore.getState().cardNumber).toBe("1234567890123456");
  });

  // --- DOBLE ENVÍO ---

  it("debe ignorar un segundo topUp simultáneo y hacer un solo cargo", async () => {
    let resolveFirst!: (result: PaymentResult) => void;
    createPaymentMock.mockReturnValueOnce(
      new Promise<PaymentResult>((resolve) => {
        resolveFirst = resolve;
      }),
    );

    const first = useWalletStore.getState().topUp(requestBody);
    const second = await useWalletStore.getState().topUp(requestBody);

    expect(second.kind).toBe("in-progress");
    expect(second.message).not.toBe("");
    expect(createPaymentMock).toHaveBeenCalledTimes(1);
    expect(useWalletStore.getState().isTopUpInProgress).toBe(true);

    resolveFirst(approvedResult(100.5));
    await first;

    expect(useWalletStore.getState().balance).toBe(100.5);
    expect(createPaymentMock).toHaveBeenCalledTimes(1);
  });

  it("debe liberar el indicador al terminar, con éxito o con fallo", async () => {
    createPaymentMock.mockResolvedValueOnce(approvedResult(100.5));
    await useWalletStore.getState().topUp(requestBody);
    expect(useWalletStore.getState().isTopUpInProgress).toBe(false);

    createPaymentMock.mockResolvedValueOnce({
      kind: "network-error",
      message: "Sin conexión.",
    });
    await useWalletStore.getState().topUp(requestBody);
    expect(useWalletStore.getState().isTopUpInProgress).toBe(false);
  });

  it("debe liberar el indicador aunque el cliente lance una excepción", async () => {
    createPaymentMock.mockRejectedValueOnce(new Error("boom"));

    await expect(useWalletStore.getState().topUp(requestBody)).rejects.toThrow(
      "boom",
    );

    expect(useWalletStore.getState().isTopUpInProgress).toBe(false);
  });

  // --- PERSISTENCIA ---

  it("debe persistir solo saldo, tarjeta y CVV", () => {
    const partialize = useWalletStore.persist.getOptions().partialize;

    const persisted = partialize?.({
      ...useWalletStore.getState(),
      balance: 50,
      cardNumber: "1234123412341234",
      cvv: "543",
      isTopUpInProgress: true,
    });

    expect(persisted).toEqual({
      balance: 50,
      cardNumber: "1234123412341234",
      cvv: "543",
    });
  });
});
