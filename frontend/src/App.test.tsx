import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: () => Promise.resolve({ status: "ok" }) })
    );
  });

  it("muestra el estado de la API", async () => {
    render(<App />);
    expect(await screen.findByText("API: ok")).toBeInTheDocument();
  });
});