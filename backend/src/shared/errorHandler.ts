import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (
  err,
  _req,
  res,
  _next
) => {
  // JSON mal formado
  if (
    err instanceof SyntaxError &&
    "status" in err &&
    err.status === 400
  ) {
    return res.status(400).json({
      error: "El cuerpo de la petición contiene JSON inválido.",
    });
  }

  // Otros errores 4xx generados por Express/body-parser
  if (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof err.status === "number" &&
    err.status >= 400 &&
    err.status < 500
  ) {
    return res.status(err.status).json({
      error: "La petición no pudo ser procesada.",
    });
  }

  // Errores internos
  return res.status(500).json({
    error: "Error interno del servidor.",
  });
};