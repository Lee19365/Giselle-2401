import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuthStore } from "./authStore";
import { verifyPassword } from "./password";

// Mock del módulo de contraseñas para evitar carga computacional pesada en jsdom
vi.mock("./password", () => ({
  createPasswordHash: vi.fn().mockResolvedValue({
    hash: "hash-falso-123",
    salt: "salt-falso-123",
  }),
  verifyPassword: vi.fn(),
}));

describe("useAuthStore", () => {
  const validRegisterData = {
    fullName: "  Giselle Aceves  ",
    email: "giselle@example.com",
    password: "Password123!",
    confirmPassword: "Password123!",
  };

  beforeEach(() => {
    // Limpiar localStorage, mocks y el estado en memoria de Zustand
    localStorage.clear();
    vi.clearAllMocks();

    useAuthStore.setState({
      user: null,
      session: null,
      hasHydrated: true,
    });
  });

  describe("register", () => {
    it("debería registrar un usuario correctamente, recortar espacios del nombre e iniciar sesión", async () => {
      const result = await useAuthStore.getState().register(validRegisterData);

      expect(result).toEqual({ success: true });

      const state = useAuthStore.getState();
      expect(state.user?.fullName).toBe("Giselle Aceves");
      expect(state.user?.email).toBe("giselle@example.com");
      expect(state.session?.userId).toBe(state.user?.id);
    });

    it('no debería incluir la propiedad "password" en el objeto user generado', async () => {
      await useAuthStore.getState().register(validRegisterData);

      const user = useAuthStore.getState().user;
      expect(user).not.toHaveProperty("password");
      expect(user).toHaveProperty("passwordHash");
      expect(user).toHaveProperty("passwordSalt");
    });

    it("debería devolver errores de validación si los datos son inválidos y no guardar ningún usuario", async () => {
      const invalidData = { ...validRegisterData, fullName: "" };
      const result = await useAuthStore.getState().register(invalidData);

      expect(result).toEqual({
        success: false,
        errors: { fullName: "El nombre completo es obligatorio." },
      });

      // El estado debe permanecer limpio
      expect(useAuthStore.getState().user).toBeNull();
    });

    it("debería rechazar un segundo registro incluso con un correo diferente y conservar al usuario original", async () => {
      await useAuthStore.getState().register(validRegisterData);
      const originalUser = useAuthStore.getState().user;

      const secondRegisterData = {
        fullName: "Otro Usuario",
        email: "otro@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      };

      const result = await useAuthStore.getState().register(secondRegisterData);

      expect(result).toEqual({
        success: false,
        errors: { form: "Ya existe una cuenta registrada en esta aplicación." },
      });

      expect(useAuthStore.getState().user?.email).toBe(originalUser?.email);
    });

    it("debería manejar el doble envío simultáneo (condición de carrera) permitiendo solo una llamada", async () => {
      const secondRegisterData = {
        fullName: "Segundo Intento",
        email: "otro@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      };

      // Lanzar dos peticiones al mismo tiempo
      const [res1, res2] = await Promise.all([
        useAuthStore.getState().register(validRegisterData),
        useAuthStore.getState().register(secondRegisterData),
      ]);

      // Exactamente una debe ser exitosa y la otra debe ser rechazada
      const successes = [res1, res2].filter((r) => r.success).length;
      const failures = [res1, res2].filter((r) => !r.success).length;

      expect(successes).toBe(1);
      expect(failures).toBe(1);
    });
  });

  describe("login", () => {
    it("debería iniciar sesión correctamente con credenciales válidas y correo no normalizado", async () => {
      await useAuthStore.getState().register(validRegisterData);
      useAuthStore.getState().logout();

      // Configurar el mock para que simule una contraseña correcta
      vi.mocked(verifyPassword).mockResolvedValueOnce(true);

      // Intento de login con espacios y mayúsculas en el correo
      const result = await useAuthStore
        .getState()
        .login("  GISELLE@Example.com ", "Password123!");

      expect(result).toEqual({ success: true });
      expect(useAuthStore.getState().session?.userId).toBe(
        useAuthStore.getState().user?.id,
      );
    });

    it("debería rechazar el inicio de sesión con correo no registrado", async () => {
      await useAuthStore.getState().register(validRegisterData);
      useAuthStore.getState().logout();

      const result = await useAuthStore
        .getState()
        .login("desconocido@example.com", "Password123!");

      expect(result).toEqual({
        success: false,
        errors: { form: "Credenciales incorrectas." },
      });
    });

    it("debería rechazar el inicio de sesión con contraseña incorrecta", async () => {
      await useAuthStore.getState().register(validRegisterData);
      useAuthStore.getState().logout();

      // Configurar el mock para simular fallo en la verificación de la clave
      vi.mocked(verifyPassword).mockResolvedValueOnce(false);

      const result = await useAuthStore
        .getState()
        .login("giselle@example.com", "WrongPassword123!");

      expect(result).toEqual({
        success: false,
        errors: { form: "Credenciales incorrectas." },
      });
    });
  });

  describe("logout", () => {
    it("debería eliminar solo la sesión pero mantener los datos del usuario registrado", async () => {
      await useAuthStore.getState().register(validRegisterData);

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).not.toBeNull();
      expect(state.user?.email).toBe("giselle@example.com");
    });
  });

  describe("persistencia (localStorage)", () => {
    it("debería guardar user y session en localStorage y excluir la propiedad hasHydrated", async () => {
      await useAuthStore.getState().register(validRegisterData);

      const storedDataRaw = localStorage.getItem("auth-storage");
      expect(storedDataRaw).not.toBeNull();

      const storedData = JSON.parse(storedDataRaw!);

      // Verificar que la clave state contiene user y session, y omite hasHydrated
      expect(storedData.state).toHaveProperty("user");
      expect(storedData.state).toHaveProperty("session");
      expect(storedData.state).not.toHaveProperty("hasHydrated");
      expect(storedData.state.user.email).toBe("giselle@example.com");
      expect(storedData.state.session.userId).toBe(storedData.state.user.id);
    });
  });
});
