/**
 * Calcul de consommation à partir de relevés d'index manuels.
 *
 * Compteur analogique : pas de courbe de charge. La conso d'une période
 * est la différence entre deux relevés consécutifs, puis extrapolée en
 * base annuelle au prorata des jours couverts.
 *
 * Une différence négative (index qui recule) est traitée comme une erreur
 * de saisie : la période est exclue du calcul et remontée en warning,
 * plutôt que d'inventer un passage à zéro du compteur.
 */

export interface MeterReadingInput {
  id?: string;
  /** Date du relevé, format YYYY-MM-DD. */
  readingDate: string;
  /** Index électricité jour (ou index unique si mono-horaire), en kWh. */
  elecDayIndex: number | null;
  /** Index électricité nuit, en kWh (compteur bi-horaire uniquement). */
  elecNightIndex: number | null;
  /** Index gaz en m³. */
  gasIndexM3: number | null;
}

export interface ConsumptionPeriod {
  from: string;
  to: string;
  days: number;
  elecDayKwh: number | null;
  elecNightKwh: number | null;
  gasM3: number | null;
  gasKwh: number | null;
  warnings: string[];
}

export interface AnnualConsumption {
  elecDayKwh: number | null;
  elecNightKwh: number | null;
  gasKwh: number | null;
  /** Jours réellement couverts par des relevés élec / gaz exploitables. */
  elecCoveredDays: number;
  gasCoveredDays: number;
}

const MS_PER_DAY = 86_400_000;
const DAYS_PER_YEAR = 365.25;

function daysBetween(fromDate: string, toDate: string): number {
  return Math.round(
    (Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) /
      MS_PER_DAY,
  );
}

function diffIndex(
  from: number | null,
  to: number | null,
  label: string,
  warnings: string[],
): number | null {
  if (from === null || to === null) return null;
  const diff = to - from;
  if (diff < 0) {
    warnings.push(
      `Index ${label} en recul (${from} -> ${to}) : période ignorée pour ce poste, vérifie la saisie.`,
    );
    return null;
  }
  return Math.round(diff * 1000) / 1000;
}

/**
 * Transforme une liste de relevés (dans n'importe quel ordre) en périodes
 * de consommation entre relevés consécutifs.
 */
export function computeConsumptionPeriods(
  readings: MeterReadingInput[],
  gasKwhPerM3: number,
): ConsumptionPeriod[] {
  const sorted = [...readings].sort((a, b) =>
    a.readingDate.localeCompare(b.readingDate),
  );

  const periods: ConsumptionPeriod[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const warnings: string[] = [];

    const elecDayKwh = diffIndex(
      prev.elecDayIndex,
      curr.elecDayIndex,
      "élec jour",
      warnings,
    );
    const elecNightKwh = diffIndex(
      prev.elecNightIndex,
      curr.elecNightIndex,
      "élec nuit",
      warnings,
    );
    const gasM3 = diffIndex(prev.gasIndexM3, curr.gasIndexM3, "gaz", warnings);

    periods.push({
      from: prev.readingDate,
      to: curr.readingDate,
      days: daysBetween(prev.readingDate, curr.readingDate),
      elecDayKwh,
      elecNightKwh,
      gasM3,
      gasKwh:
        gasM3 === null ? null : Math.round(gasM3 * gasKwhPerM3 * 1000) / 1000,
      warnings,
    });
  }

  return periods;
}

/**
 * Extrapole les périodes en consommation annuelle, au prorata des jours
 * couverts — indépendamment pour l'élec et le gaz, car certains relevés
 * peuvent ne couvrir qu'une des deux énergies.
 *
 * Limite assumée du MVP : pas de correction saisonnière. Un historique
 * couvrant uniquement l'hiver surestimera le gaz annuel ; plus la période
 * couverte est longue, plus l'estimation est fiable.
 */
export function annualizeConsumption(
  periods: ConsumptionPeriod[],
): AnnualConsumption {
  let elecDayTotal = 0;
  let elecNightTotal = 0;
  let elecDays = 0;
  let gasTotal = 0;
  let gasDays = 0;

  for (const period of periods) {
    if (period.elecDayKwh !== null) {
      elecDayTotal += period.elecDayKwh;
      elecNightTotal += period.elecNightKwh ?? 0;
      elecDays += period.days;
    }
    if (period.gasKwh !== null) {
      gasTotal += period.gasKwh;
      gasDays += period.days;
    }
  }

  const scale = (total: number, days: number) =>
    days > 0 ? Math.round((total / days) * DAYS_PER_YEAR * 100) / 100 : null;

  return {
    elecDayKwh: scale(elecDayTotal, elecDays),
    elecNightKwh: elecDays > 0 ? scale(elecNightTotal, elecDays) : null,
    gasKwh: scale(gasTotal, gasDays),
    elecCoveredDays: elecDays,
    gasCoveredDays: gasDays,
  };
}

/** Nombre de jours écoulés depuis le dernier relevé (null si aucun relevé). */
export function daysSinceLastReading(
  readings: MeterReadingInput[],
  today: string,
): number | null {
  if (readings.length === 0) return null;
  const last = readings
    .map((r) => r.readingDate)
    .sort()
    .at(-1)!;
  return daysBetween(last, today);
}

export function isReadingReminderDue(
  daysSince: number | null,
  reminderDays: number,
): boolean {
  return daysSince === null || daysSince >= reminderDays;
}
