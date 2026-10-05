import { describe, expect, it } from "vitest";
import { RACES, SNAILS, formatWins, getWinsBySnail } from "./raceData";

describe("datos simulados de las carreras", () => {
  it("debe tener 6 caracoles con ids únicos", () => {
    expect(SNAILS).toHaveLength(6);
    expect(new Set(SNAILS.map((snail) => snail.id)).size).toBe(6);
  });

  it("debe tener 6 carreras con ids únicos", () => {
    expect(RACES).toHaveLength(6);
    expect(new Set(RACES.map((race) => race.id)).size).toBe(6);
  });

  it("debe asignar cada carrera a un caracol que existe", () => {
    const snailIds = SNAILS.map((snail) => snail.id);

    for (const race of RACES) {
      expect(snailIds).toContain(race.winnerId);
    }
  });

  it("debe sumar 6 victorias, una por carrera", () => {
    const total = getWinsBySnail().reduce((sum, item) => sum + item.wins, 0);

    expect(total).toBe(6);
    expect(total).toBe(RACES.length);
  });

  it("debe devolver un elemento por caracol, en su orden y sin victorias negativas", () => {
    const wins = getWinsBySnail();

    expect(wins.map((item) => item.id)).toEqual(SNAILS.map((snail) => snail.id));
    for (const item of wins) {
      expect(Number.isInteger(item.wins)).toBe(true);
      expect(item.wins).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("getWinsBySnail", () => {
  it("debe contar las carreras ganadas por cada caracol", () => {
    const snails = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
    ];
    const races = [
      { id: "r1", name: "R1", winnerId: "b" },
      { id: "r2", name: "R2", winnerId: "b" },
      { id: "r3", name: "R3", winnerId: "a" },
    ];

    expect(getWinsBySnail(snails, races)).toEqual([
      { id: "a", name: "A", wins: 1 },
      { id: "b", name: "B", wins: 2 },
      { id: "c", name: "C", wins: 0 },
    ]);
  });
});

describe("formatWins", () => {
  it.each([
    [0, "0 victorias"],
    [1, "1 victoria"],
    [2, "2 victorias"],
  ])("debe formatear %s", (wins, expected) => {
    expect(formatWins(wins)).toBe(expected);
  });
});
