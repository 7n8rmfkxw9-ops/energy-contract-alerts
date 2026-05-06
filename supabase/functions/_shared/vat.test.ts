import { describe, it, expect } from "vitest";
import { normalizeVatNumber } from "./vat";

describe("normalizeVatNumber", () => {
  it("strips spaces, dots and dashes", () => {
    expect(normalizeVatNumber("12 345.678-901", "FR")).toBe("12345678901");
  });

  it("uppercases the result", () => {
    expect(normalizeVatNumber("ie6388047v", "IE")).toBe("6388047V");
  });

  it("removes a leading country prefix when present", () => {
    expect(normalizeVatNumber("FR12345678901", "FR")).toBe("12345678901");
    expect(normalizeVatNumber("DE 123 456 789", "DE")).toBe("123456789");
  });

  it("does not remove the prefix when it does not match the country code", () => {
    expect(normalizeVatNumber("DE123456789", "FR")).toBe("DE123456789");
  });

  it("normalizes the country code casing before stripping the prefix", () => {
    expect(normalizeVatNumber("fr12345678901", "fr")).toBe("12345678901");
    expect(normalizeVatNumber("Fr-1234-5678-901", "FR")).toBe("12345678901");
  });

  it("leaves an already-clean number untouched apart from casing", () => {
    expect(normalizeVatNumber("12345678901", "FR")).toBe("12345678901");
  });

  it("returns an empty string for input made entirely of separators", () => {
    expect(normalizeVatNumber("   --  ", "FR")).toBe("");
  });

  it("only strips ONE country prefix, even if the digits coincidentally start with it", () => {
    // "FR" prefix removed once; remaining digits happen to start with "FR" again? Not possible
    // with letters-only prefix, so verify a single prefix removal only.
    expect(normalizeVatNumber("FRFR12345", "FR")).toBe("FR12345");
  });
});
