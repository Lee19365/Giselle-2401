import type { BetsSummary } from "./raceData";

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface BetsDonutChartProps {
  data: BetsSummary;
}

// Donut en SVG propio de apuestas ganadas vs. perdidas.
// La leyenda en texto hace que no dependa solo del color.
export function BetsDonutChart({ data }: BetsDonutChartProps) {
  const total = data.won + data.lost;
  const wonLength = total === 0 ? 0 : (data.won / total) * CIRCUMFERENCE;
  const lostLength = total === 0 ? 0 : (data.lost / total) * CIRCUMFERENCE;

  return (
    <figure className="chart">
      <figcaption>Apuestas ganadas y perdidas</figcaption>

      <svg
        className="donut-svg"
        viewBox="0 0 120 120"
        role="img"
        aria-label={`Apuestas: ${data.won} ganadas y ${data.lost} perdidas`}
      >
        <circle
          className="donut-track"
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          strokeWidth="18"
        />
        {wonLength > 0 && (
          <circle
            className="bet-won"
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="18"
            strokeDasharray={`${wonLength} ${CIRCUMFERENCE - wonLength}`}
            transform="rotate(-90 60 60)"
          />
        )}
        {lostLength > 0 && (
          <circle
            className="bet-lost"
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="18"
            strokeDasharray={`${lostLength} ${CIRCUMFERENCE - lostLength}`}
            strokeDashoffset={-wonLength}
            transform="rotate(-90 60 60)"
          />
        )}
        <text className="donut-total" x="60" y="60" textAnchor="middle">
          {total}
        </text>
        <text className="donut-label" x="60" y="76" textAnchor="middle">
          apuestas
        </text>
      </svg>

      <ul className="chart-legend">
        <li>
          <span className="chart-swatch bet-won" aria-hidden="true" />
          Ganadas: {data.won}
        </li>
        <li>
          <span className="chart-swatch bet-lost" aria-hidden="true" />
          Perdidas: {data.lost}
        </li>
      </ul>
    </figure>
  );
}
