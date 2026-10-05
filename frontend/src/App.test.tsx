import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";
import { useAuthStore } from "./features/auth/authStore";

describe("rutas protegidas y públicas", () => {
  const testUser = {
    id: "test-user-id",
    fullName: "Usuario de Prueba",
    email: "test@example.com",
    passwordHash: "test-password-hash",
    passwordSalt: "test-password-salt",
    createdAt: "2026-10-03T00:00:00.000Z",
  };

  beforeEach(() => {
    localStorage.clear();

    useAuthStore.setState({
      user: null,
      session: null,
      hasHydrated: true,
    });
  });

  it("redirige la ruta principal al login cuando no hay sesión", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Iniciar Sesión" }),
    ).toBeInTheDocument();
  });

  it("redirige una ruta desconocida al login cuando no hay sesión", () => {
    render(
      <MemoryRouter initialEntries={["/ruta-que-no-existe"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Iniciar Sesión" }),
    ).toBeInTheDocument();
  });

  it("muestra el dashboard cuando existe una sesión activa", () => {
    useAuthStore.setState({
      user: testUser,
      session: {
        userId: testUser.id,
      },
      hasHydrated: true,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Hola, Usuario de Prueba" }),
    ).toBeInTheDocument();

    expect(screen.getByText(testUser.email)).toBeInTheDocument();
  });

  it("redirige al dashboard cuando un usuario autenticado intenta entrar al login", () => {
    useAuthStore.setState({
      user: testUser,
      session: {
        userId: testUser.id,
      },
      hasHydrated: true,
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Hola, Usuario de Prueba" }),
    ).toBeInTheDocument();
  });

  it("muestra Cargando mientras la sesión todavía no se ha hidratado", () => {
    useAuthStore.setState({
      user: null,
      session: null,
      hasHydrated: false,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText("Cargando...")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Iniciar Sesión" }),
    ).not.toBeInTheDocument();
  });
});
