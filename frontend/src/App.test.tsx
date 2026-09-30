import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    // Se reemplaza fetch por una versión falsa para que la prueba no dependa de que el backend esté encendido
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: () => Promise.resolve({ status: "ok" }) })
    );
  });

  it("muestra el estado de la API", async () => {
    render(<App />);
    // findByText espera a que aparezca el texto, porque la respuesta llega de forma asíncrona
    expect(await screen.findByText("API: ok")).toBeInTheDocument();
  });
});