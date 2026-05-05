// Logique de scoring déterministe pour la fonction match-lots.
// Module pur — aucun import Deno ni Supabase — pour qu'il soit testable
// depuis Vitest (Node) tout en restant utilisable depuis l'edge function.

export type MatchPrefs = {
  origins?: string[];
  processes?: string[];
  flavor_keywords?: string[];
  budget_per_kg_max?: number | null;
  monthly_volume_kg?: number | null;
};

export type ScoringLot = {
  process?: string | null;
  flavor_notes?: string[] | null;
  sca_score?: number | string | null;
  price_per_kg: number | string;
};

export type ScoringProducer = {
  country?: string | null;
  region?: string | null;
};

export type ScoringResult = {
  score: number;
  reasons: string[];
};

const BASE_SCORE = 40;
const ORIGIN_BONUS = 20;
const PROCESS_BONUS = 15;
const BUDGET_BONUS = 10;
const BUDGET_PENALTY = 15;
const FLAVOR_PER_KEYWORD = 5;
const FLAVOR_CAP = 15;
const SCA_BONUS = 5;
const SCA_THRESHOLD = 85;

export const scoreLot = (
  prefs: MatchPrefs,
  lot: ScoringLot,
  producer: ScoringProducer,
): ScoringResult => {
  let score = BASE_SCORE;
  const reasons: string[] = [];

  if (prefs.origins?.length) {
    const inOrigin = prefs.origins.some(
      (o) =>
        (producer.country ?? "").toLowerCase().includes(o.toLowerCase()) ||
        (producer.region ?? "").toLowerCase().includes(o.toLowerCase()),
    );
    if (inOrigin) {
      score += ORIGIN_BONUS;
      reasons.push(`origine ${producer.country}`);
    }
  }

  if (prefs.processes?.length && lot.process && prefs.processes.includes(lot.process)) {
    score += PROCESS_BONUS;
    reasons.push(`méthode ${lot.process}`);
  }

  if (prefs.budget_per_kg_max != null) {
    if (Number(lot.price_per_kg) <= prefs.budget_per_kg_max) {
      score += BUDGET_BONUS;
      reasons.push("prix ≤ budget");
    } else {
      score -= BUDGET_PENALTY;
    }
  }

  if (prefs.flavor_keywords?.length && lot.flavor_notes?.length) {
    const overlap = prefs.flavor_keywords.filter((k) =>
      lot.flavor_notes!.some((n) => n.toLowerCase().includes(k.toLowerCase())),
    ).length;
    if (overlap) {
      score += Math.min(FLAVOR_CAP, overlap * FLAVOR_PER_KEYWORD);
      reasons.push("profil aromatique");
    }
  }

  if (lot.sca_score && Number(lot.sca_score) >= SCA_THRESHOLD) {
    score += SCA_BONUS;
    reasons.push("score SCA élevé");
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
};
