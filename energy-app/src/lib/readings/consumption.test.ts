import { describe, expect, it } from "vitest";
import {
  annualizeConsumption,
  computeConsumptionPeriods,
  daysSinceLastReading,
  isReadingReminderDue,
  type MeterReadingInput,
} from "./consumption";

const GAS_FACTOR = 11.5;

function reading(
  date: string,
  day: number | null,
  night: number | null,
  gas: number | null,
): MeterReadingInput {
  return {
    readingDate: date,
    elecDayIndex: day,
    elecNightIndex: night,
    gasIndexM3: gas,
  };
}

describe("computeConsumptionPeriods", () => {
  it("calcule la conso par différence entre relevés consécutifs", () => {
    const periods = computeConsumptionPeriods(
      [
        reading("2026-01-01", 1000, 500, 200),
        reading("2026-02-01", 1100, 560, 250),
      ],
      GAS_FACTOR,
    );

    expect(periods).toHaveLength(1);
    expect(periods[0]).toMatchObject({
      from: "2026-01-01",
      to: "2026-02-01",
      days: 31,
      elecDayKwh: 100,
      elecNightKwh: 60,
      gasM3: 50,
      gasKwh: 575, // 50 m³ x 11,5 kWh/m³
      warnings: [],
    });
  });

  it("trie les relevés par date avant de calculer", () => {
    const periods = computeConsumptionPeriods(
      [
        reading("2026-02-01", 1100, null, null),
        reading("2026-01-01", 1000, null, null),
      ],
      GAS_FACTOR,
    );

    expect(periods).toHaveLength(1);
    expect(periods[0].elecDayKwh).toBe(100);
  });

  it("signale un index en recul (erreur de saisie) sans casser le reste", () => {
    const periods = computeConsumptionPeriods(
      [
        reading("2026-01-01", 1000, null, 200),
        reading("2026-02-01", 900, null, 250),
      ],
      GAS_FACTOR,
    );

    expect(periods[0].elecDayKwh).toBeNull();
    expect(periods[0].gasM3).toBe(50);
    expect(periods[0].warnings).toHaveLength(1);
    expect(periods[0].warnings[0]).toMatch(/élec jour/);
  });

  it("gère un compteur mono-horaire (pas d'index nuit) et un relevé sans gaz", () => {
    const periods = computeConsumptionPeriods(
      [
        reading("2026-01-01", 1000, null, null),
        reading("2026-03-01", 1200, null, null),
      ],
      GAS_FACTOR,
    );

    expect(periods[0].elecDayKwh).toBe(200);
    expect(periods[0].elecNightKwh).toBeNull();
    expect(periods[0].gasM3).toBeNull();
    expect(periods[0].warnings).toHaveLength(0);
  });

  it("retourne une liste vide avec moins de deux relevés", () => {
    expect(computeConsumptionPeriods([], GAS_FACTOR)).toHaveLength(0);
    expect(
      computeConsumptionPeriods([reading("2026-01-01", 1, 2, 3)], GAS_FACTOR),
    ).toHaveLength(0);
  });
});

describe("annualizeConsumption", () => {
  it("extrapole au prorata des jours couverts", () => {
    const periods = computeConsumptionPeriods(
      [
        reading("2026-01-01", 1000, 500, 200),
        reading("2026-02-01", 1100, 560, 250),
      ],
      GAS_FACTOR,
    );

    const annual = annualizeConsumption(periods);

    // 100 kWh / 31 jours x 365,25 jours
    expect(annual.elecDayKwh).toBeCloseTo(1178.23, 2);
    expect(annual.elecNightKwh).toBeCloseTo(706.94, 2);
    expect(annual.gasKwh).toBeCloseTo(6774.8, 1);
    expect(annual.elecCoveredDays).toBe(31);
    expect(annual.gasCoveredDays).toBe(31);
  });

  it("annualise élec et gaz indépendamment quand les relevés diffèrent", () => {
    // le gaz n'a été relevé que sur la première période
    const periods = computeConsumptionPeriods(
      [
        reading("2026-01-01", 1000, null, 200),
        reading("2026-02-01", 1100, null, 250),
        reading("2026-03-01", 1180, null, null),
      ],
      GAS_FACTOR,
    );

    const annual = annualizeConsumption(periods);

    expect(annual.elecCoveredDays).toBe(59); // 31 + 28
    expect(annual.gasCoveredDays).toBe(31);
    expect(annual.elecDayKwh).toBeCloseTo(((100 + 80) / 59) * 365.25, 1);
  });

  it("retourne null quand aucune période exploitable", () => {
    const annual = annualizeConsumption([]);
    expect(annual.elecDayKwh).toBeNull();
    expect(annual.gasKwh).toBeNull();
  });
});

describe("rappel de relevé", () => {
  it("compte les jours depuis le dernier relevé", () => {
    const readings = [
      reading("2026-05-01", 1, null, null),
      reading("2026-06-01", 2, null, null),
    ];
    expect(daysSinceLastReading(readings, "2026-07-01")).toBe(30);
    expect(daysSinceLastReading([], "2026-07-01")).toBeNull();
  });

  it("déclenche le rappel au-delà du seuil ou sans aucun relevé", () => {
    expect(isReadingReminderDue(35, 30)).toBe(true);
    expect(isReadingReminderDue(10, 30)).toBe(false);
    expect(isReadingReminderDue(null, 30)).toBe(true);
  });
});
