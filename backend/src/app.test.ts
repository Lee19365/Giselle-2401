// Importa las funciones de Vitest: describe agrupa pruebas, it define una prueba, expect verifica resultados
import { describe, it, expect } from "vitest";
// Importa Supertest, que simula peticiones HTTP a la app sin abrir un puerto real
import request from "supertest";
// Importa la app (no el servidor), por eso separamos app.ts de server.ts
import { app } from "./app";

describe("GET /health", () => {
  // Define una prueba; es async porque la petición devuelve una promesa
  it("responde ok", async () => {
    // Simula un GET a /health y espera la respuesta
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);

    expect(res.body).toEqual({ status: "ok" });
  });
});
