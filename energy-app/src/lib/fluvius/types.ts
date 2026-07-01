export type EnergyType = "electricity" | "gas";

export interface ParsedReading {
  /** Début du créneau quart-horaire, ISO 8601 UTC. */
  readingAt: string;
  valueKwh: number;
}

export interface FluviusParseWarning {
  line: number;
  message: string;
}

export interface FluviusParseResult {
  energyType: EnergyType;
  readings: ParsedReading[];
  rowCount: number;
  skippedRowCount: number;
  periodStart: string | null;
  periodEnd: string | null;
  warnings: FluviusParseWarning[];
}
