import { describe, it, expect } from "vitest";
import {
  CERTIFICATION_LABELS,
  PROCESS_LABELS,
  STATUS_LABELS,
  formatPrice,
  type Certification,
  type LotStatus,
  type ProcessMethod,
} from "./lots";

describe("formatPrice", () => {
  // Intl output uses NBSP ( ) and narrow NBSP ( ) characters around
  // the currency symbol/code depending on the runtime, so assertions normalize
  // any non-breaking space variants to a regular space.
  const norm = (s: string) => s.replace(/[  ]/g, " ");

  it("defaults to EUR with French locale formatting", () => {
    expect(norm(formatPrice(12.5))).toBe("12,50 €");
  });

  it("respects an explicit currency", () => {
    const formatted = norm(formatPrice(9.99, "USD"));
    expect(formatted).toContain("9,99");
    expect(formatted).toMatch(/\$|USD/);
  });

  it("renders zero and integer values with two decimals", () => {
    expect(norm(formatPrice(0))).toBe("0,00 €");
    expect(norm(formatPrice(42))).toBe("42,00 €");
  });

  it("handles negative amounts", () => {
    expect(norm(formatPrice(-3.5))).toContain("3,50");
  });
});

describe("PROCESS_LABELS", () => {
  it("maps every process enum value", () => {
    const expected: ProcessMethod[] = [
      "washed",
      "natural",
      "honey",
      "anaerobic",
      "wet_hulled",
      "carbonic_maceration",
      "other",
    ];
    for (const key of expected) {
      expect(PROCESS_LABELS[key]).toBeTruthy();
    }
    expect(Object.keys(PROCESS_LABELS).sort()).toEqual([...expected].sort());
  });
});

describe("STATUS_LABELS", () => {
  it("maps every lot status", () => {
    const expected: LotStatus[] = ["draft", "available", "reserved", "sold_out"];
    for (const key of expected) {
      expect(STATUS_LABELS[key]).toBeTruthy();
    }
    expect(Object.keys(STATUS_LABELS).sort()).toEqual([...expected].sort());
  });
});

describe("CERTIFICATION_LABELS", () => {
  it("maps every certification", () => {
    const expected: Certification[] = [
      "organic",
      "fairtrade",
      "rainforest_alliance",
      "utz",
      "demeter",
      "direct_trade",
      "none",
    ];
    for (const key of expected) {
      expect(CERTIFICATION_LABELS[key]).toBeTruthy();
    }
    expect(Object.keys(CERTIFICATION_LABELS).sort()).toEqual([...expected].sort());
  });
});
