import { z } from "zod";

// --- Auth (Auth.tsx) ---

export const signUpSchema = z.object({
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(8, "8 caractères minimum").max(72),
  fullName: z.string().trim().min(1, "Nom requis").max(120),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  role: z.enum(["producteur", "torrefacteur", "shop", "barista"]),
});

export const signInSchema = z.object({
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(1, "Mot de passe requis").max(72),
});

// --- Lots (ProducerLotEdit.tsx) ---

export const lotSchema = z.object({
  name: z.string().trim().min(1).max(120),
  variety: z.string().trim().max(120).optional().or(z.literal("")),
  process: z
    .enum(["washed", "natural", "honey", "anaerobic", "wet_hulled", "carbonic_maceration", "other"])
    .optional()
    .nullable(),
  humidity_pct: z.coerce.number().min(0).max(100).optional().nullable(),
  acidity: z.coerce.number().min(0).max(10).optional().nullable(),
  body: z.coerce.number().min(0).max(10).optional().nullable(),
  sweetness: z.coerce.number().min(0).max(10).optional().nullable(),
  sca_score: z.coerce.number().min(0).max(100).optional().nullable(),
  volume_kg: z.coerce.number().min(0),
  price_per_kg: z.coerce.number().min(0),
  currency: z.string().length(3),
  status: z.enum(["draft", "available", "reserved", "sold_out"]),
  harvest_year: z.coerce.number().int().min(2000).max(2100).optional().nullable(),
  producer_notes: z.string().trim().max(1500).optional().or(z.literal("")),
});

// --- Waitlist (Waitlist.tsx) ---

export const waitlistEmailSchema = z.string().trim().email("Email invalide").max(255);
