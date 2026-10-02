import { useState } from "react";
import { useAuthStore } from "./authStore";

export function RegisterForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const register = useAuthStore((state) => state.register);
  const user = useAuthStore((state) => state.user);
  const session = useAuthStore((state) => state.session);
  const logout = useAuthStore((state) => state.logout);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("Registrando...");

    const result = await register({
      fullName,
      email,
      password,
      confirmPassword,
    });

    if (result.success) {
      setMessage("¡Registro exitoso!");
    } else {
      setMessage("Error: " + JSON.stringify(result.errors));
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "400px", color: "#fff" }}>
      <h2>Prueba de Autenticación</h2>

      {session ? (
        <div>
          <p> Sesión activa para: <strong>{user?.email}</strong></p>
          <p>Nombre: {user?.fullName}</p>
          <button onClick={() => logout()}>Cerrar Sesión</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <input
            type="text"
            placeholder="Nombre completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirmar contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button type="submit">Registrar</button>
        </form>
      )}

      {message && <p style={{ marginTop: "10px" }}>{message}</p>}
    </div>
  );
}