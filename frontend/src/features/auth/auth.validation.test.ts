
import { describe, it, expect } from "vitest";
import { normalizeEmail, validateRegister } from "./auth.validation";

describe("validateRegister", () => {
  const validData = {
    fullName: "John Doe",
    email: "john.doe@example.com",
    password: "Password123",
    confirmPassword: "Password123"
  };

  it("debería devolver un objeto vacío con datos válidos", () => {
    const result = validateRegister(validData);
    expect(result).toEqual({});
  });

  it("debería rechazar un nombre vacío", () => {
    const result = validateRegister({ ...validData, fullName: "" });
    expect(result.fullName).toBe("El nombre completo es obligatorio.");
  });

  it("debería rechazar un nombre que solo contiene espacios", () => {
    const result = validateRegister({ ...validData, fullName: "     " });
    expect(result.fullName).toBe("El nombre completo es obligatorio.");
  });

  it("debería rechazar un correo sin @", () => {
    const result = validateRegister({ ...validData, email: "john.doeexample.com" });
    expect(result.email).toBe("El correo electrónico no es válido.");
  });

  // Contraseña --------
  it("debería rechazar una contraseña sin números", () => {
    const result = validateRegister({
      ...validData,
      password: "Password",
      confirmPassword: "Password"
    });
    expect(result.password).toBe("La contraseña debe tener al menos 8 caracteres, incluyendo una letra y un número.");
  });

  it("debería rechazar una contraseña corta", () => {
    const result = validateRegister({
      ...validData,
      password: "Pass",
      confirmPassword: "Pass"
    });
    expect(result.password).toBe("La contraseña debe tener al menos 8 caracteres, incluyendo una letra y un número.");
  });

  it("debería rechazar una contraseña sin letras", () => {
    const result = validateRegister({
      ...validData,
      password: "12345678",
      confirmPassword: "12345678"
    });
    expect(result.password).toBe("La contraseña debe tener al menos 8 caracteres, incluyendo una letra y un número.");
  });

  it("debería aceptar contraseñas con caracteres especiales (símbolos permitidos)", () => {
    const result = validateRegister({
      ...validData,
      password: "Password123!",
      confirmPassword: "Password123!"
    });
    expect(result).toEqual({});
  });

  it("debería rechazar cuando las contraseñas no coinciden", () => {
    const result = validateRegister({
      ...validData,
      confirmPassword: "Password1234"
    });
    expect(result.confirmPassword).toBe("Las contraseñas no coinciden.");
  });

  it("debería rechazar campos vacíos", () => {
    const invalidData = {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: ""
    };
    const result = validateRegister(invalidData);

    expect(result.fullName).toBe("El nombre completo es obligatorio.");
    expect(result.email).toBe("El correo electrónico no es válido.");
    expect(result.password).toBe("La contraseña debe tener al menos 8 caracteres, incluyendo una letra y un número.");
    expect(result.confirmPassword).toBeUndefined();
  });
});

describe("normalizeEmail", () => {
  it("debería convertir el correo a minúsculas y eliminar espacios", () => {
    const email = " JOHN.DOE@EXAMPLE.COM ";
    const result = normalizeEmail(email);
    expect(result).toBe("john.doe@example.com");
  });
});