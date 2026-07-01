import { detectDelimiter, normalizeHeader, splitCsvLine, splitLines } from "./csv";
import { brusselsLocalToUtcIso } from "./timezone";
import type { EnergyType, FluviusParseResult, FluviusParseWarning, ParsedReading } from "./types";

/**
 * Parseur pour les exports "verbruikshistoriek" quart-horaires de
 * mijn.fluvius.be (élec et gaz sont téléchargés séparément par Fluvius,
 * d'où le paramètre `energyType` explicite plutôt qu'une détection auto).
 *
 * Les en-têtes exacts varient selon les versions de l'export Fluvius
 * (ex: "Van (datum)" vs "Van Datum"), donc le matching se fait sur des
 * alias normalisés plutôt que sur des noms de colonnes figés.
 */

type CanonicalField =
  | "fromDate"
  | "fromTime"
  | "toDate"
  | "register"
  | "volume"
  | "validationStatus";

const HEADER_ALIASES: Record<CanonicalField, string[]> = {
  fromDate: ["vandatum", "startdatum", "datum", "van"],
  fromTime: ["vantijdstip", "vantijd", "vanuur", "starttijdstip"],
  toDate: ["totdatum", "einddatum"],
  register: ["registratie", "register"],
  volume: ["volume", "waarde", "verbruik"],
  validationStatus: ["validatiestatus", "status"],
};

const INJECTION_KEYWORDS = ["injectie", "injection", "export"];

function buildColumnIndex(headerFields: string[]): Partial<Record<CanonicalField, number>> {
  const normalized = headerFields.map(normalizeHeader);
  const index: Partial<Record<CanonicalField, number>> = {};

  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [
    CanonicalField,
    string[],
  ][]) {
    const matchIdx = normalized.findIndex((h) => aliases.includes(h));
    if (matchIdx !== -1) {
      index[field] = matchIdx;
    }
  }

  return index;
}

function parseBelgianNumber(raw: string): number | null {
  if (!raw) return null;
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  // si la valeur n'avait pas de virgule décimale (ex: "0.123" déjà au
  // format US), le remplacement ci-dessus l'aurait cassée : on retente brut.
  const value = Number.isFinite(Number(normalized))
    ? Number(normalized)
    : Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function parseDateParts(raw: string): { year: number; month: number; day: number } | null {
  const match = raw.match(/^(\d{1,4})[-/](\d{1,2})[-/](\d{1,4})$/);
  if (!match) return null;

  const [, a, b, c] = match;
  if (a.length === 4) {
    // YYYY-MM-DD
    return { year: Number(a), month: Number(b), day: Number(c) };
  }
  // DD-MM-YYYY (format belge standard)
  return { year: Number(c), month: Number(b), day: Number(a) };
}

function parseTimeParts(raw: string): { hour: number; minute: number } | null {
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export function parseFluviusCsv(csvText: string, energyType: EnergyType): FluviusParseResult {
  const lines = splitLines(csvText);
  const warnings: FluviusParseWarning[] = [];

  if (lines.length === 0) {
    return {
      energyType,
      readings: [],
      rowCount: 0,
      skippedRowCount: 0,
      periodStart: null,
      periodEnd: null,
      warnings: [{ line: 0, message: "Fichier vide." }],
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headerFields = splitCsvLine(lines[0], delimiter);
  const columnIndex = buildColumnIndex(headerFields);

  const missingRequired = (["fromDate", "fromTime", "volume"] as CanonicalField[]).filter(
    (field) => columnIndex[field] === undefined,
  );

  if (missingRequired.length > 0) {
    return {
      energyType,
      readings: [],
      rowCount: 0,
      skippedRowCount: 0,
      periodStart: null,
      periodEnd: null,
      warnings: [
        {
          line: 1,
          message: `Colonnes obligatoires introuvables dans l'en-tête : ${missingRequired.join(", ")}. Vérifie qu'il s'agit bien d'un export quart-horaire Mijn Fluvius.`,
        },
      ],
    };
  }

  // Additionne les valeurs qui tombent sur le même créneau (ex: registres
  // jour/nuit distincts pour un même quart d'heure) ; le détail jour/nuit
  // est recalculé plus tard par le moteur de comparaison à partir de
  // l'heure du créneau, pas du nom du registre.
  const readingsByTimestamp = new Map<string, number>();
  let rowCount = 0;
  let skippedRowCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const lineNumber = i + 1;
    const fields = splitCsvLine(lines[i], delimiter);

    const registerRaw = columnIndex.register !== undefined ? fields[columnIndex.register] : "";
    if (INJECTION_KEYWORDS.some((kw) => registerRaw.toLowerCase().includes(kw))) {
      continue; // injection solaire : hors scope MVP
    }

    rowCount++;

    const dateParts = parseDateParts(fields[columnIndex.fromDate!] ?? "");
    const timeParts = parseTimeParts(fields[columnIndex.fromTime!] ?? "");
    const volume = parseBelgianNumber(fields[columnIndex.volume!] ?? "");

    if (!dateParts || !timeParts || volume === null || volume < 0) {
      skippedRowCount++;
      warnings.push({
        line: lineNumber,
        message: "Ligne ignorée : date, heure ou volume illisible.",
      });
      continue;
    }

    const readingAt = brusselsLocalToUtcIso(
      dateParts.year,
      dateParts.month,
      dateParts.day,
      timeParts.hour,
      timeParts.minute,
    );

    readingsByTimestamp.set(readingAt, (readingsByTimestamp.get(readingAt) ?? 0) + volume);
  }

  const readings: ParsedReading[] = Array.from(readingsByTimestamp.entries())
    .map(([readingAt, valueKwh]) => ({ readingAt, valueKwh: Math.round(valueKwh * 10000) / 10000 }))
    .sort((a, b) => a.readingAt.localeCompare(b.readingAt));

  return {
    energyType,
    readings,
    rowCount,
    skippedRowCount,
    periodStart: readings.at(0)?.readingAt ?? null,
    periodEnd: readings.at(-1)?.readingAt ?? null,
    warnings,
  };
}
