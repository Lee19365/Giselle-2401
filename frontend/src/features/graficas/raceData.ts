// Datos simulados de las carreras de caracoles para las gráficas del dashboard.
// Las victorias NO se escriben a mano: se derivan de quién ganó cada carrera,
// así que los datos no pueden contradecirse.

export interface Snail {
  id: string;
  name: string;
}

export interface Race {
  id: string;
  name: string;
  winnerId: string;
}

export interface SnailWins {
  id: string;
  name: string;
  wins: number;
}

export const SNAILS: readonly Snail[] = [
  { id: "turbo", name: "Turbo" },
  { id: "rayo", name: "Rayo" },
  { id: "gary", name: "Gary" },
  { id: "concha", name: "Concha" },
  { id: "flash", name: "Flash" },
  { id: "lento", name: "Lento" },
];

export const RACES: readonly Race[] = [
  { id: "carrera-1", name: "Carrera 1", winnerId: "turbo" },
  { id: "carrera-2", name: "Carrera 2", winnerId: "rayo" },
  { id: "carrera-3", name: "Carrera 3", winnerId: "turbo" },
  { id: "carrera-4", name: "Carrera 4", winnerId: "gary" },
  { id: "carrera-5", name: "Carrera 5", winnerId: "concha" },
  { id: "carrera-6", name: "Carrera 6", winnerId: "flash" },
];

// Cuenta las carreras ganadas por cada caracol, en el mismo orden que snails.
export function getWinsBySnail(
  snails: readonly Snail[] = SNAILS,
  races: readonly Race[] = RACES
): SnailWins[] {
  return snails.map((snail) => ({
    id: snail.id,
    name: snail.name,
    wins: races.filter((race) => race.winnerId === snail.id).length,
  }));
}

export function formatWins(wins: number): string {
  return `${wins} ${wins === 1 ? "victoria" : "victorias"}`;
}

// --- Apuestas simuladas ---
// Una apuesta por carrera. Ganada o perdida se DERIVA comparando el caracol
// elegido con el ganador de esa carrera, así nunca contradice a RACES.

export interface Bet {
  id: string;
  raceId: string;
  snailId: string;
}

export interface BetsSummary {
  won: number;
  lost: number;
}

export const BETS: readonly Bet[] = [
  { id: "apuesta-1", raceId: "carrera-1", snailId: "turbo" },
  { id: "apuesta-2", raceId: "carrera-2", snailId: "rayo" },
  { id: "apuesta-3", raceId: "carrera-3", snailId: "turbo" },
  { id: "apuesta-4", raceId: "carrera-4", snailId: "flash" },
  { id: "apuesta-5", raceId: "carrera-5", snailId: "turbo" },
  { id: "apuesta-6", raceId: "carrera-6", snailId: "lento" },
];

export function getBetsSummary(
  bets: readonly Bet[] = BETS,
  races: readonly Race[] = RACES
): BetsSummary {
  const won = bets.filter((bet) =>
    races.some((race) => race.id === bet.raceId && race.winnerId === bet.snailId)
  ).length;

  return { won, lost: bets.length - won };
}