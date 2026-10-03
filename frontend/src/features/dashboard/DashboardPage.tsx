


import { useAuthStore } from "../auth/authStore";
import "./DashboardPage.css";

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    // Al cerrar sesión, ProtectedRoute detectará que
    // session pasó a null y redirigirá al login.
    logout();
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="dashboard-welcome">
          <h1>Hola, {user?.fullName}</h1>
          <p>{user?.email}</p>
        </div>

        <button
  className="dashboard-logout-button"
  onClick={handleLogout}
>
  Cerrar Sesión
</button>
      </header>

      <section className="balance-card">
        <h2>Saldo Disponible</h2>
        <div className="balance-amount">$0.00</div>
      </section>
    </div>
  );
}

