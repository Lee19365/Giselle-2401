import type { SnailWins } from "./raceData";

interface WinsBarChartProps {
  data: readonly SnailWins[];
}

// Barras horizontales con HTML y CSS: cada fila ya trae nombre y valor
// como texto, así que el gráfico es legible sin depender del color.
export function WinsBarChart({ data }: WinsBarChartProps) {
  // Math.max(1, ...) evita dividir entre 0 cuando nadie tiene victorias.
  const max = Math.max(1, ...data.map((item) => item.wins));

  return (
    <figure className="chart">
      <figcaption>Victorias por caracol</figcaption>

      <ul className="bar-list">
        {data.map((item, index) => (
          <li key={item.id} className="bar-row">
            <span className="bar-name">{item.name}</span>
            <span className="bar-track" aria-hidden="true">
              <span
                className={`bar-fill chart-color-${index}`}
                style={{ width: `${(item.wins / max) * 100}%` }}
              />
            </span>
            <span className="bar-value">{item.wins}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
