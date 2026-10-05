import { useAuthStore } from "../auth/authStore";
import { formatMoney } from "../wallet/formatMoney";
import { TopUpForm } from "../wallet/TopUpForm";
import { useWalletStore } from "../wallet/wallet.store";
import { getBetsSummary, getWinsBySnail } from "../graficas/raceData";
import { WinsBarChart } from "../graficas/WinsBarChart";
import { BetsDonutChart } from "../graficas/BetsDonutChart";
import "./DashboardPage.css";

// Se calcula una sola vez: los datos son simulados y no cambian.
const winsBySnail = getWinsBySnail();
const betsSummary = getBetsSummary();

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const balance = useWalletStore((state) => state.balance);

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

        <button className="dashboard-logout-button" onClick={handleLogout}>
          Cerrar Sesión
        </button>
      </header>

      <section className="balance-card">
        <h2>Saldo Disponible</h2>
        <div className="balance-amount">{formatMoney(balance)}</div>
      </section>

      <div className="dashboard-row">
        <section className="topup-section">
          <h2>Recargar saldo</h2>
          <TopUpForm />
        </section>

        <section className="charts-section" aria-labelledby="charts-title">
          <h2 id="charts-title" className="charts-title">
            Carreras de caracoles
          </h2>
          <div className="charts-grid">
            <div className="chart-card">
              <WinsBarChart data={winsBySnail} />
            </div>
            <div className="chart-card">
              <BetsDonutChart data={betsSummary} />
            </div>
          </div>

          <div className="charts-note">
            <h3>¿Cómo funcionan estas estadísticas?</h3>
            <p>
              Cada carrera tiene un caracol ganador y se simuló una apuesta por
              carrera. Todo se calcula a partir de esos resultados, por eso las
              dos gráficas son congruentes entre sí.
            </p>
            <ul>
              <li>
                <strong>Barras:</strong> cuántas carreras ganó cada caracol en
                el día simulado. Mientras más larga la barra, más victorias.
              </li>
              <li>
                <strong>Donut:</strong> una apuesta se cuenta como ganada si el
                caracol elegido ganó esa carrera, y como perdida si no. El
                número del centro es el total de apuestas.
              </li>
              <li>
                Un caracol sin victorias aparece con 0 en las barras.
              </li>
            </ul>
            <p>Los datos son simulados y se usan solo como demostración.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
