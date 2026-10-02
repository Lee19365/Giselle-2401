export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ValidationErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

//EMAIL_REGEX y PASSWORD_REGEX no dependen de data. Son simplemente las reglas .
//Correo: formato válido
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Contraseña: mínimo 8 caracteres, al menos una letra y un número
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateRegister(data: RegisterData): ValidationErrors {
  const errors: ValidationErrors = {};
  // Nombre completo: no vacío, sin contar solo espacio
  if (!data.fullName.trim()) {
    errors.fullName = "El nombre completo es obligatorio.";
  }
  //Correo
  const email = normalizeEmail(data.email);
  if (!EMAIL_REGEX.test(email)) {
    errors.email = "El correo electrónico no es válido.";
  }

  //contraseña
  if (!PASSWORD_REGEX.test(data.password)) {
    errors.password =
      "La contraseña debe tener al menos 8 caracteres, incluyendo una letra y un número.";
  }
  if (data.confirmPassword !== data.password) {
    errors.confirmPassword = "Las contraseñas no coinciden.";
  }
  return errors;
}
