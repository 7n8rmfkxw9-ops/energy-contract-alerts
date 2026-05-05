import { describe, it, expect } from "vitest";
import { isFreeEmailDomain, requiresProEmail, EU_VAT_COUNTRIES } from "./verification";

describe("isFreeEmailDomain", () => {
  it("matches common free providers", () => {
    expect(isFreeEmailDomain("alice@gmail.com")).toBe(true);
    expect(isFreeEmailDomain("bob@yahoo.fr")).toBe(true);
    expect(isFreeEmailDomain("carol@protonmail.com")).toBe(true);
  });

  it("is case-insensitive and trims surrounding whitespace", () => {
    expect(isFreeEmailDomain("  Alice@GMAIL.com ")).toBe(true);
    expect(isFreeEmailDomain("USER@Outlook.FR")).toBe(true);
  });

  it("rejects professional domains", () => {
    expect(isFreeEmailDomain("buyer@terra.coffee")).toBe(false);
    expect(isFreeEmailDomain("ops@some-roastery.de")).toBe(false);
  });

  it("returns false for malformed input without an @", () => {
    expect(isFreeEmailDomain("no-at-sign")).toBe(false);
    expect(isFreeEmailDomain("")).toBe(false);
  });

  it("uses only the domain portion (ignores local part)", () => {
    expect(isFreeEmailDomain("gmail.com@example.org")).toBe(false);
  });
});

describe("requiresProEmail", () => {
  it("requires a pro email for pro roles", () => {
    expect(requiresProEmail("producteur")).toBe(true);
    expect(requiresProEmail("torrefacteur")).toBe(true);
    expect(requiresProEmail("shop")).toBe(true);
  });

  it("does not require a pro email for non-pro roles", () => {
    expect(requiresProEmail("barista")).toBe(false);
    expect(requiresProEmail("admin")).toBe(false);
    expect(requiresProEmail("")).toBe(false);
    expect(requiresProEmail("unknown")).toBe(false);
  });
});

describe("EU_VAT_COUNTRIES", () => {
  it("contains exactly 27 EU member states", () => {
    expect(EU_VAT_COUNTRIES).toHaveLength(27);
  });

  it("uses unique 2-letter ISO country codes", () => {
    const codes = EU_VAT_COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("provides a non-empty French display name for every country", () => {
    for (const c of EU_VAT_COUNTRIES) {
      expect(c.name.trim().length).toBeGreaterThan(0);
    }
  });

  it("includes France as a representative entry", () => {
    expect(EU_VAT_COUNTRIES).toContainEqual({ code: "FR", name: "France" });
  });
});
