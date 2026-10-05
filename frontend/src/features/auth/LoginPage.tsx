import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "./authStore";
import "./auth.css";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const result = await login(email, password);

      if (!result.success) {
        // Cuando success es false, errors está garantizado por el tipo.
        setFormError(result.errors.form || "Credenciales incorrectas.");
      }
    } catch {
      // Red de seguridad por si ocurre un error inesperado.
      setFormError("Ocurrió un error inesperado. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Iniciar Sesión</h1>

        <p className="auth-subtitle">Ingresa tus credenciales para acceder</p>

        {formError && (
          <div className="error-message" role="alert">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
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
            />
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
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="auth-button" disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="auth-footer">
          ¿No tienes una cuenta? <Link to="/register">Regístrate aquí</Link>
        </div>
      </div>
    </div>
  );
}
