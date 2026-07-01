import { describe, expect, it } from "vitest";
import { parseFluviusCsv } from "./parseFluviusCsv";

const HEADER =
  "EAN;Meter nummer;Metertype;Registratie;Van (datum);Van (tijdstip);Tot (datum);Tot (tijdstip);Volume;Eenheid;Validatiestatus";

describe("parseFluviusCsv — électricité", () => {
  it("parse les créneaux quart-horaires et ignore l'injection solaire", () => {
    const csv = [
      HEADER,
      "541448911000012345;12345678;Digitale meter;Afname;01-01-2024;00:00;01-01-2024;00:15;0,123;kWh;Gevalideerd",
      "541448911000012345;12345678;Digitale meter;Afname;01-01-2024;00:15;01-01-2024;00:30;0,145;kWh;Gevalideerd",
      "541448911000012345;12345678;Digitale meter;Injectie;01-01-2024;00:15;01-01-2024;00:30;0,050;kWh;Gevalideerd",
    ].join("\n");

    const result = parseFluviusCsv(csv, "electricity");

    expect(result.warnings).toHaveLength(0);
    expect(result.readings).toHaveLength(2);
    expect(result.readings[0]).toEqual({
      readingAt: "2023-12-31T23:00:00.000Z",
      valueKwh: 0.123,
    });
    expect(result.readings[1]).toEqual({
      readingAt: "2023-12-31T23:15:00.000Z",
      valueKwh: 0.145,
    });
    expect(result.periodStart).toBe("2023-12-31T23:00:00.000Z");
    expect(result.periodEnd).toBe("2023-12-31T23:15:00.000Z");
  });

  it("additionne les registres jour/nuit qui tombent sur le même créneau", () => {
    const csv = [
      HEADER,
      "541448911000012345;12345678;Digitale meter;Afname Dag;01-06-2024;12:00;01-06-2024;12:15;0,200;kWh;Gevalideerd",
      "541448911000012345;12345678;Digitale meter;Afname Nacht;01-06-2024;12:00;01-06-2024;12:15;0,050;kWh;Gevalideerd",
    ].join("\n");

    const result = parseFluviusCsv(csv, "electricity");

    expect(result.readings).toHaveLength(1);
    expect(result.readings[0].valueKwh).toBeCloseTo(0.25, 4);
  });

  it("ignore les lignes avec un volume illisible et remonte un warning", () => {
    const csv = [
      HEADER,
      "541448911000012345;12345678;Digitale meter;Afname;01-01-2024;00:00;01-01-2024;00:15;n/a;kWh;Gevalideerd",
      "541448911000012345;12345678;Digitale meter;Afname;01-01-2024;00:15;01-01-2024;00:30;0,145;kWh;Gevalideerd",
    ].join("\n");

    const result = parseFluviusCsv(csv, "electricity");

    expect(result.readings).toHaveLength(1);
    expect(result.rowCount).toBe(2);
    expect(result.skippedRowCount).toBe(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].line).toBe(2);
  });
});

describe("parseFluviusCsv — gaz", () => {
  it("parse un export gaz (registre unique, pas de jour/nuit)", () => {
    const csv = [
      HEADER,
      "541448912000098765;98765432;Digitale meter;Afname;01-01-2024;00:00;01-01-2024;00:15;1,542;kWh;Gevalideerd",
    ].join("\n");

    const result = parseFluviusCsv(csv, "gas");

    expect(result.energyType).toBe("gas");
    expect(result.readings).toHaveLength(1);
    expect(result.readings[0].valueKwh).toBe(1.542);
  });
});

describe("parseFluviusCsv — cas limites", () => {
  it("retourne un warning explicite si les colonnes attendues sont absentes", () => {
    const csv = "Foo;Bar\n1;2";

    const result = parseFluviusCsv(csv, "electricity");

    expect(result.readings).toHaveLength(0);
    expect(result.warnings[0].message).toMatch(/Colonnes obligatoires/);
  });

  it("gère un fichier vide", () => {
    const result = parseFluviusCsv("", "electricity");

    expect(result.readings).toHaveLength(0);
    expect(result.warnings[0].message).toBe("Fichier vide.");
  });

  it("accepte le point-virgule ET la virgule décimale (format belge)", () => {
    const csv = [
      HEADER,
      "541448911000012345;12345678;Digitale meter;Afname;15-08-2024;14:30;15-08-2024;14:45;2,5;kWh;Gevalideerd",
    ].join("\n");

    const result = parseFluviusCsv(csv, "electricity");

    expect(result.readings[0].valueKwh).toBe(2.5);
  });
});
