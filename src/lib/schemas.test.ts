import { describe, it, expect } from "vitest";
import { lotSchema, signInSchema, signUpSchema, waitlistEmailSchema } from "./schemas";

const baseSignUp = {
  email: "alice@example.com",
  password: "supersecret",
  fullName: "Alice Dupont",
  company: "Ferme du Soleil",
  role: "producteur" as const,
};

const baseLot = {
  name: "Sidamo Natural",
  variety: "Heirloom",
  process: "natural" as const,
  humidity_pct: 11,
  acidity: 7.5,
  body: 6,
  sweetness: 8,
  sca_score: 86,
  volume_kg: 60,
  price_per_kg: 12.5,
  currency: "EUR",
  status: "available" as const,
  harvest_year: 2025,
  producer_notes: "Lot exceptionnel.",
};

describe("signUpSchema", () => {
  it("accepts a fully populated payload", () => {
    expect(signUpSchema.safeParse(baseSignUp).success).toBe(true);
  });

  it("trims and validates the email", () => {
    const ok = signUpSchema.safeParse({ ...baseSignUp, email: "  alice@example.com  " });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.email).toBe("alice@example.com");

    const bad = signUpSchema.safeParse({ ...baseSignUp, email: "not-an-email" });
    expect(bad.success).toBe(false);
  });

  it("requires at least 8 characters in the password", () => {
    expect(signUpSchema.safeParse({ ...baseSignUp, password: "short" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...baseSignUp, password: "12345678" }).success).toBe(true);
  });

  it("rejects passwords longer than 72 characters (bcrypt limit)", () => {
    const tooLong = "a".repeat(73);
    expect(signUpSchema.safeParse({ ...baseSignUp, password: tooLong }).success).toBe(false);
  });

  it("requires a non-empty fullName after trimming", () => {
    expect(signUpSchema.safeParse({ ...baseSignUp, fullName: "   " }).success).toBe(false);
  });

  it("allows the company field to be empty or omitted", () => {
    expect(signUpSchema.safeParse({ ...baseSignUp, company: "" }).success).toBe(true);
    const { company: _drop, ...without } = baseSignUp;
    expect(signUpSchema.safeParse(without).success).toBe(true);
  });

  it("only accepts the four declared roles", () => {
    for (const role of ["producteur", "torrefacteur", "shop", "barista"] as const) {
      expect(signUpSchema.safeParse({ ...baseSignUp, role }).success).toBe(true);
    }
    expect(signUpSchema.safeParse({ ...baseSignUp, role: "admin" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...baseSignUp, role: "" }).success).toBe(false);
  });

  it("returns the localized French error message for invalid email", () => {
    const res = signUpSchema.safeParse({ ...baseSignUp, email: "nope" });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0].message).toBe("Email invalide");
  });
});

describe("signInSchema", () => {
  it("accepts any non-empty password", () => {
    expect(signInSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
  });

  it("rejects an empty password with the localized message", () => {
    const res = signInSchema.safeParse({ email: "a@b.co", password: "" });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0].message).toBe("Mot de passe requis");
  });

  it("rejects an invalid email", () => {
    expect(signInSchema.safeParse({ email: "no-at", password: "x" }).success).toBe(false);
  });
});

describe("lotSchema", () => {
  it("accepts a complete payload", () => {
    expect(lotSchema.safeParse(baseLot).success).toBe(true);
  });

  it("coerces numeric fields from strings", () => {
    const res = lotSchema.safeParse({
      ...baseLot,
      humidity_pct: "10",
      acidity: "7.5",
      sca_score: "86",
      volume_kg: "60",
      price_per_kg: "12.50",
      harvest_year: "2024",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.humidity_pct).toBe(10);
      expect(res.data.price_per_kg).toBe(12.5);
      expect(res.data.harvest_year).toBe(2024);
    }
  });

  it("enforces /10 sensory bounds for acidity, body and sweetness", () => {
    expect(lotSchema.safeParse({ ...baseLot, acidity: 11 }).success).toBe(false);
    expect(lotSchema.safeParse({ ...baseLot, body: -1 }).success).toBe(false);
    expect(lotSchema.safeParse({ ...baseLot, sweetness: 10 }).success).toBe(true);
  });

  it("enforces SCA score between 0 and 100", () => {
    expect(lotSchema.safeParse({ ...baseLot, sca_score: 0 }).success).toBe(true);
    expect(lotSchema.safeParse({ ...baseLot, sca_score: 100 }).success).toBe(true);
    expect(lotSchema.safeParse({ ...baseLot, sca_score: 101 }).success).toBe(false);
  });

  it("enforces humidity between 0 and 100 percent", () => {
    expect(lotSchema.safeParse({ ...baseLot, humidity_pct: 100 }).success).toBe(true);
    expect(lotSchema.safeParse({ ...baseLot, humidity_pct: 100.1 }).success).toBe(false);
    expect(lotSchema.safeParse({ ...baseLot, humidity_pct: -1 }).success).toBe(false);
  });

  it("requires a 3-letter currency code", () => {
    expect(lotSchema.safeParse({ ...baseLot, currency: "EU" }).success).toBe(false);
    expect(lotSchema.safeParse({ ...baseLot, currency: "EURO" }).success).toBe(false);
    expect(lotSchema.safeParse({ ...baseLot, currency: "USD" }).success).toBe(true);
  });

  it("rejects negative volume or price", () => {
    expect(lotSchema.safeParse({ ...baseLot, volume_kg: -1 }).success).toBe(false);
    expect(lotSchema.safeParse({ ...baseLot, price_per_kg: -0.01 }).success).toBe(false);
    expect(lotSchema.safeParse({ ...baseLot, volume_kg: 0, price_per_kg: 0 }).success).toBe(true);
  });

  it("clamps harvest year to a sane integer range", () => {
    expect(lotSchema.safeParse({ ...baseLot, harvest_year: 1999 }).success).toBe(false);
    expect(lotSchema.safeParse({ ...baseLot, harvest_year: 2101 }).success).toBe(false);
    expect(lotSchema.safeParse({ ...baseLot, harvest_year: 2000 }).success).toBe(true);
    expect(lotSchema.safeParse({ ...baseLot, harvest_year: 2025.5 }).success).toBe(false);
  });

  it("only accepts the four declared statuses", () => {
    for (const status of ["draft", "available", "reserved", "sold_out"] as const) {
      expect(lotSchema.safeParse({ ...baseLot, status }).success).toBe(true);
    }
    expect(lotSchema.safeParse({ ...baseLot, status: "archived" }).success).toBe(false);
  });

  it("only accepts the seven declared process methods", () => {
    const valid = [
      "washed",
      "natural",
      "honey",
      "anaerobic",
      "wet_hulled",
      "carbonic_maceration",
      "other",
    ] as const;
    for (const process of valid) {
      expect(lotSchema.safeParse({ ...baseLot, process }).success).toBe(true);
    }
    expect(lotSchema.safeParse({ ...baseLot, process: "fermented" }).success).toBe(false);
  });

  it("treats null and undefined as acceptable for optional numeric fields", () => {
    expect(
      lotSchema.safeParse({
        ...baseLot,
        humidity_pct: null,
        acidity: null,
        body: null,
        sweetness: null,
        sca_score: null,
        harvest_year: null,
        process: null,
      }).success,
    ).toBe(true);
  });

  it("requires a non-empty trimmed name", () => {
    expect(lotSchema.safeParse({ ...baseLot, name: "" }).success).toBe(false);
    expect(lotSchema.safeParse({ ...baseLot, name: "   " }).success).toBe(false);
    expect(lotSchema.safeParse({ ...baseLot, name: "a".repeat(121) }).success).toBe(false);
  });

  it("caps producer_notes at 1500 characters", () => {
    expect(lotSchema.safeParse({ ...baseLot, producer_notes: "x".repeat(1500) }).success).toBe(true);
    expect(lotSchema.safeParse({ ...baseLot, producer_notes: "x".repeat(1501) }).success).toBe(false);
  });
});

describe("waitlistEmailSchema", () => {
  it("accepts a valid email and trims whitespace", () => {
    const res = waitlistEmailSchema.safeParse("  hello@terra.coffee ");
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toBe("hello@terra.coffee");
  });

  it("rejects empty or malformed input with the localized message", () => {
    const bad = waitlistEmailSchema.safeParse("nope");
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.error.issues[0].message).toBe("Email invalide");
  });

  it("rejects emails longer than 255 characters", () => {
    const atLimit = `${"a".repeat(250)}@b.co`; // 255 chars exactly
    expect(waitlistEmailSchema.safeParse(atLimit).success).toBe(true);
    const tooLong = `${"a".repeat(251)}@b.co`; // 256 chars
    expect(waitlistEmailSchema.safeParse(tooLong).success).toBe(false);
  });
});
