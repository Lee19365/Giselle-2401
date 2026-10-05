import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createPayment } from "./snailpayClient";
import type { PaymentResult } from "./snailpayClient";
import type { PaymentRequest } from "./wallet.types";

// Resultado de topUp: lo que devuelve el cliente, más el caso de que ya haya
// otra recarga en curso. La pantalla solo necesita `kind` y `message`.
export type TopUpResult =
  PaymentResult | { kind: "in-progress"; message: string };

interface WalletState {
  // Persistidos
  balance: number;
  cardNumber: string;
  cvv: string;
  // No persistido: evita el doble envío y deshabilita el botón.
  isTopUpInProgress: boolean;
  topUp: (data: PaymentRequest) => Promise<TopUpResult>;
}

const IN_PROGRESS_MESSAGE =
  "Ya hay una recarga en curso. Espera a que termine.";

// Dinero: el contrato trabaja en unidades con 2 decimales, así que se redondea
// a 2 decimales al sumar. Evita 0.1 + 0.2 = 0.30000000000000004.
function addMoney(current: number, amount: number): number {
  return Math.round((current + amount) * 100) / 100;
}

// El backend rechaza espacios y guiones en el número de tarjeta. Se limpian
// aquí para que lo que se envía y lo que se guarda sea siempre lo mismo,
// sin importar qué pantalla llame a topUp.
function normalizeCardNumber(value: string): string {
  return value.replace(/[\s-]/g, "");
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      balance: 0,
      cardNumber: "",
      cvv: "",
      isTopUpInProgress: false,

      topUp: async (data) => {
        // get() y set() son síncronos: la segunda llamada simultánea siempre
        // ve el indicador ya activado, aunque el botón aún no se haya deshabilitado.
        if (get().isTopUpInProgress) {
          return { kind: "in-progress", message: IN_PROGRESS_MESSAGE };
        }

        set({ isTopUpInProgress: true });

        try {
          const request: PaymentRequest = {
            ...data,
            card_number: normalizeCardNumber(data.card_number),
          };

          const result = await createPayment(request);

          // Solo un pago aprobado modifica el saldo y guarda la tarjeta.
          if (result.kind === "approved") {
            set((state) => ({
              balance: addMoney(
                state.balance,
                result.payment.transaction_amount,
              ),
              cardNumber: request.card_number,
              cvv: request.cvv,
            }));
          }

          return result;
        } finally {
          set({ isTopUpInProgress: false });
        }
      },
    }),
    {
      // Con un almacenamiento síncrono como localStorage, persist hidrata el
      // store al crearlo. Se verifica a mano: recargar con saldo y comprobar
      // que no parpadea en $0.00.
      //
      // Una sola cuenta por navegador: el saldo y la tarjeta viven en su propia
      // clave, sin ligarse al usuario, y sobreviven al cierre de sesión
      // (decisión y limitación conocida).
      name: "wallet-storage",
      // Solo saldo, tarjeta y CVV. Ni el indicador de carga ni el `payment`
      // de la respuesta se persisten.
      partialize: (state) => ({
        balance: state.balance,
        cardNumber: state.cardNumber,
        cvv: state.cvv,
      }),
    },
  ),
);
