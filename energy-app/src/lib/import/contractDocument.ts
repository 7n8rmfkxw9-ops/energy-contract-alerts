// Extraction (best-effort) des prix d'un contrat élec/gaz à partir du
// texte brut d'une fiche tarifaire ou d'une facture (PDF avec calque
// texte, ou image passée à l'OCR). Fonction pure et testable — le texte
// est déjà extrait en amont (voir src/app/api/import-contract/route.ts).
//
// Les fiches tarifaires standardisées (imposées par la CREG/VREG) sont
// bien plus fiables à parser qu'une facture au format libre : mêmes
// libellés d'un fournisseur à l'autre. On tente les deux, avec des
// motifs plus larges pour couvrir le format libre, mais rien n'est
// enregistré sans relecture par l'utilisateur — voir `matchedFields`.

export const KNOWN_PROVIDERS = [
  "Luminus",
  "Engie",
  "Electrabel",
  "TotalEnergies",
  "Total Energies",
  "Mega",
  "Power Online",
  "Bolt",
  "Plenty",
  "OCTA+",
  "Octa Plus",
  "EnergyVision",
  "Wikipower",
  "Elegant",
  "Eneco",
  "Energie.be",
  "Aspiravi",
  "Trevion",
  "Dats 24",
  "Frank Energie",
  "Poweo",
];

export type ExtractedField =
  | "provider"
  | "offerName"
  | "priceElecKwhDay"
  | "priceElecKwhNight"
  | "priceGasKwh"
  | "fixedFeeElecAnnual"
  | "fixedFeeGasAnnual"
  | "commitmentMonths";

export interface ContractExtraction {
  provider: string | null;
  offerName: string | null;
  priceElecKwhDay: number | null;
  priceElecKwhNight: number | null;
  priceGasKwh: number | null;
  fixedFeeElecAnnual: number | null;
  fixedFeeGasAnnual: number | null;
  commitmentMonths: number | null;
  /** Champs pour lesquels une valeur a été trouvée dans le texte. */
  matchedFields: ExtractedField[];
}

const NUMBER = "(\\d{1,3}(?:[.,]\\d{1,5})?)";

/** "0,1523 €/kWh" -> 0.1523 ; "15,23 c€/kWh" -> 0.1523 (cents -> euros). */
function parsePriceMatch(value: string, unitHint: string): number | null {
  const num = Number(value.replace(",", "."));
  if (!Number.isFinite(num)) return null;
  const isCents = /c\s?€|cent/i.test(unitHint);
  return isCents ? num / 100 : num;
}

function findFirst(text: string, patterns: RegExp[]): RegExpMatchArray | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
}

function findPrice(text: string, keywordPatterns: RegExp[]): number | null {
  for (const keyword of keywordPatterns) {
    // fenêtre de ~50 caractères après le mot-clé pour capter le nombre
    // et son unité, qui peuvent être sur la même ligne dans un ordre
    // variable selon le fournisseur.
    const windowed = new RegExp(
      keyword.source + `[^\\n]{0,50}?${NUMBER}\\s*(c?€\\s*/?\\s*kwh)`,
      "i",
    );
    const match = text.match(windowed);
    if (match) {
      const price = parsePriceMatch(match[1], match[2]);
      if (price !== null) return price;
    }
  }
  return null;
}

function findFee(text: string, keywordPatterns: RegExp[]): number | null {
  for (const keyword of keywordPatterns) {
    const windowed = new RegExp(
      keyword.source + `[^\\n]{0,40}?${NUMBER}\\s*€`,
      "i",
    );
    const match = text.match(windowed);
    if (match) {
      const value = Number(match[1].replace(",", "."));
      if (Number.isFinite(value)) return value;
    }
  }
  return null;
}

export function extractContractFromText(rawText: string): ContractExtraction {
  const text = rawText.replace(/\r/g, "");
  const matchedFields: ExtractedField[] = [];

  const provider =
    KNOWN_PROVIDERS.find((p) =>
      new RegExp(`\\b${p.replace(/[.+]/g, "\\$&")}\\b`, "i").test(text),
    ) ?? null;
  if (provider) matchedFields.push("provider");

  const offerNameMatch = findFirst(text, [
    /(?:nom du produit|product(?:naam)?|offre|formule)\s*[:\-]?\s*([A-Za-zÀ-ÿ0-9 &+'-]{3,40})/i,
  ]);
  const offerName = offerNameMatch ? offerNameMatch[1].trim() : null;
  if (offerName) matchedFields.push("offerName");

  const priceElecKwhDay = findPrice(text, [
    /tarif\s*(?:mono|simple)?\s*jour/i,
    /prix.{0,15}jour/i,
    /dagtarief/i,
    /jour(?:nal(?:ier)?)?/i,
  ]);
  if (priceElecKwhDay !== null) matchedFields.push("priceElecKwhDay");

  const priceElecKwhNight = findPrice(text, [
    /tarif\s*nuit/i,
    /prix.{0,15}nuit/i,
    /nachttarief/i,
    /\bnuit\b/i,
  ]);
  if (priceElecKwhNight !== null) matchedFields.push("priceElecKwhNight");

  const priceGasKwh = findPrice(text, [
    /prix.{0,15}gaz/i,
    /gaz\s*naturel/i,
    /aardgasprijs/i,
    /\bgas\b/i,
  ]);
  if (priceGasKwh !== null) matchedFields.push("priceGasKwh");

  const fixedFeeElecAnnual = findFee(text, [
    /redevance.{0,40}?(?:élec|electric)/i,
    /(?:élec|electric).{0,40}?redevance/i,
    /abonnement.{0,40}?(?:élec|electric)/i,
    /vaste vergoeding.{0,40}?elektriciteit/i,
  ]);
  if (fixedFeeElecAnnual !== null) matchedFields.push("fixedFeeElecAnnual");

  const fixedFeeGasAnnual = findFee(text, [
    /redevance.{0,40}?gaz/i,
    /gaz.{0,40}?redevance/i,
    /abonnement.{0,40}?gaz/i,
    /vaste vergoeding.{0,40}?gas/i,
  ]);
  if (fixedFeeGasAnnual !== null) matchedFields.push("fixedFeeGasAnnual");

  const commitmentMatch = text.match(
    /(\d{1,2})\s*(?:mois|maand(?:en)?|months?)\b.{0,20}?(?:engagement|durée|looptijd)|(?:engagement|durée|looptijd).{0,20}?(\d{1,2})\s*(?:mois|maand(?:en)?|months?)/i,
  );
  const commitmentMonths = commitmentMatch
    ? Number(commitmentMatch[1] ?? commitmentMatch[2])
    : null;
  if (commitmentMonths !== null && Number.isFinite(commitmentMonths)) {
    matchedFields.push("commitmentMonths");
  }

  return {
    provider,
    offerName,
    priceElecKwhDay,
    priceElecKwhNight,
    priceGasKwh,
    fixedFeeElecAnnual,
    fixedFeeGasAnnual,
    commitmentMonths: Number.isFinite(commitmentMonths) ? commitmentMonths : null,
    matchedFields,
  };
}
