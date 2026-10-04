
import express from "express";
import cors from "cors";

import { snailpayRouter } from "./snailpay/snailpay.routes";
import { errorHandler } from "./shared/errorHandler";

// Crea la aplicación de Express
export const app = express();

// Permite peticiones desde el frontend de Vite
app.use(cors({ origin: "http://localhost:5173" }));

// Permite recibir JSON en las peticiones
app.use(express.json());

// Ruta de comprobación
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Rutas de SnailPay
app.use("/snailpay", snailpayRouter);

// Middleware global de errores.
// Debe estar DESPUÉS de las rutas.
app.use(errorHandler);
