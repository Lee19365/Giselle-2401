// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createPasswordHash, verifyPassword } from "./password";

describe("Password Hashing & Verification (password.ts)", () => {
  // 1. Devuelve hash y salt no vacíos (sin verificaciones redundantes)
  it("debe generar un hash y un salt no vacíos", async () => {
    const { hash, salt } = await createPasswordHash("miContraseñaSegura123");

    expect(hash.length).toBeGreaterThan(0);
    expect(salt.length).toBeGreaterThan(0);
  });

  // 2. Devuelve true con la contraseña correcta
  it("debe devolver true cuando la contraseña es correcta", async () => {
    const password = "PasswordCorrecta!2026";
    const { hash, salt } = await createPasswordHash(password);

    const isValid = await verifyPassword(password, hash, salt);

    expect(isValid).toBe(true);
  });

  // 3. Devuelve false con una contraseña incorrecta
  it("debe devolver false cuando la contraseña es incorrecta", async () => {
    const password = "PasswordCorrecta!2026";
    const { hash, salt } = await createPasswordHash(password);

    const isValid = await verifyPassword("PasswordIncorrecta!2026", hash, salt);

    expect(isValid).toBe(false);
  });

  // 4. Mismo texto da hash y salt distintos por aleatoriedad
  it("debe generar hash y salt distintos para la misma contraseña ejecutada dos veces", async () => {
    const password = "MismaContraseña";

    const firstResult = await createPasswordHash(password);
    const secondResult = await createPasswordHash(password);

    expect(firstResult.salt).not.toBe(secondResult.salt);
    expect(firstResult.hash).not.toBe(secondResult.hash);
  });

  // 5. Verificación de formato y longitud exacta de salida (256 bits = 32 bytes = 44 chars Base64)
  it("debe generar un hash en Base64 con la longitud exacta esperada de 44 caracteres", async () => {
    const { hash, salt } = await createPasswordHash("cualquierPassword");

    // 256 bits / 8 = 32 bytes. 32 bytes en Base64 son ceil(32 / 3) * 4 = 44 caracteres.
    expect(hash.length).toBe(44);
    // 16 bytes de salt en Base64 son ceil(16 / 3) * 4 = 24 caracteres.
    expect(salt.length).toBe(24);
  });

  // 6. Prueba del Salt Ajeno / Cruzado
  it("debe devolver false al intentar verificar con la contraseña correcta pero usando el salt de otro usuario", async () => {
    const password = "PasswordUsuario1";

    const user1 = await createPasswordHash(password);
    const user2 = await createPasswordHash("PasswordUsuario2");

    // Usamos la contraseña correcta de User1 y su hash, pero cruzamos el salt con el de User2
    const isValid = await verifyPassword(password, user1.hash, user2.salt);

    expect(isValid).toBe(false);
  });

  // 7. Compatibilidad con UTF-8 (Acentos, caracteres especiales y Emojis)
  it("debe procesar y verificar correctamente contraseñas con caracteres UTF-8 especiales y emojis", async () => {
    const complexPassword = "🔐ContraseñaConAcentosYÉmòjïś_2026!#ñ";
    const { hash, salt } = await createPasswordHash(complexPassword);

    const isValid = await verifyPassword(complexPassword, hash, salt);

    expect(isValid).toBe(true);
  });
});
