
import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "./authStore";
import type { ValidationErrors } from "./auth.validation";
import "./auth.css";
import "./RegisterForm.css";

type RegisterFormErrors = ValidationErrors & {
  form?: string;
};

export function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Guardamos todos los errores para poder mostrarlos
  // debajo del campo correspondiente.
  const [errors, setErrors] = useState<RegisterFormErrors>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  const register = useAuthStore((state) => state.register);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Limpiamos los errores anteriores antes de validar nuevamente.
    setErrors({});
    setIsSubmitting(true);

    try {
      const result = await register({
        fullName,
        email,
        password,
        confirmPassword,
      });

      if (!result.success) {
        // Conservamos el objeto completo de errores.
        setErrors(result.errors);
      }
    } catch {
      // Red de seguridad por si ocurre un error inesperado.
      setErrors({
        form: "Ocurrió un error inesperado. Inténtalo de nuevo.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Crear Cuenta</h1>

        <p className="auth-subtitle">
          Completa tus datos para registrarte
        </p>

        {/* Error general del formulario */}
        {errors.form && (
          <div className="error-message" role="alert">
            {errors.form}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="auth-form"
          noValidate
        >
          <div className="form-group">
            <label htmlFor="fullName">Nombre completo</label>

            <input
              id="fullName"
              type="text"
              placeholder="Tu nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isSubmitting}
              autoComplete="name"
              aria-invalid={!!errors.fullName}
            />

            {errors.fullName && (
              <p className="field-error">{errors.fullName}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>

            <input
              id="email"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              autoComplete="email"
              aria-invalid={!!errors.email}
            />

            {errors.email && (
              <p className="field-error">{errors.email}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>

            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="new-password"
              aria-invalid={!!errors.password}
            />

            {errors.password && (
              <p className="field-error">{errors.password}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              Confirmar contraseña
            </label>

            <input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
            />

            {errors.confirmPassword && (
              <p className="field-error">{errors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Registrando..." : "Registrar"}
          </button>
        </form>

        <div className="auth-footer">
          ¿Ya tienes una cuenta?{" "}
          <Link to="/login">Inicia sesión aquí</Link>
        </div>
      </div>
    </div>
  );
}

