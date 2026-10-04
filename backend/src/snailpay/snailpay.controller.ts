import type { Request, Response } from "express";
import {
  buildFailedPayment,
  processPayment,
} from "./snailpay.service";
import { validatePayment } from "./snailpay.validation";

export function createPayment(req: Request, res: Response) {
  // Express 5 puede dejar req.body como undefined
  // cuando no existe un cuerpo JSON.
  const body = req.body ?? {};

  // 1. Sistema no disponible
  if (process.env.SNAILPAY_DOWN === "true") {
    const payment = buildFailedPayment(
      "error",
      "service_unavailable",
      body
    );

    return res.status(503).json(payment);
  }

  // 2. Validar los datos
  const validation = validatePayment(body);

  if (!validation.valid) {
    const failedFields = Object.keys(validation.errors);

    const statusDetail =
      failedFields.includes("general")
        ? "invalid_data"
        : `invalid_data: ${failedFields.join(", ")}`;

    const payment = buildFailedPayment(
      "rejected",
      statusDetail,
      body
    );

    return res.status(400).json({
      ...payment,
      errors: validation.errors,
    });
  }

  // 3. Procesar el pago
  // validation.payment ya es un PaymentRequest comprobado.
  const payment = processPayment(validation.payment);

  // 4. Pago rechazado
  if (payment.status === "rejected") {
    return res.status(402).json(payment);
  }

  // 5. Pago aprobado
  return res.status(200).json(payment);
}