import { describe, expect, it } from "vitest";
import { brusselsLocalToUtcIso } from "./timezone";

describe("brusselsLocalToUtcIso", () => {
  it("converts winter time (CET, UTC+1)", () => {
    expect(brusselsLocalToUtcIso(2024, 1, 15, 0, 0)).toBe(
      "2024-01-14T23:00:00.000Z",
    );
  });

  it("converts summer time (CEST, UTC+2)", () => {
    expect(brusselsLocalToUtcIso(2024, 7, 15, 0, 0)).toBe(
      "2024-07-14T22:00:00.000Z",
    );
  });

  it("handles a quarter-hour slot just after the spring DST jump", () => {
    // le 31 mars 2024, l'heure passe de 02:00 à 03:00 (CET -> CEST)
    expect(brusselsLocalToUtcIso(2024, 3, 31, 3, 15)).toBe(
      "2024-03-31T01:15:00.000Z",
    );
  });
});
