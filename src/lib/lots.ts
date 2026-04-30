import type { Database } from "@/integrations/supabase/types";

export type Lot = Database["public"]["Tables"]["coffee_lots"]["Row"];
export type LotInsert = Database["public"]["Tables"]["coffee_lots"]["Insert"];
export type ProcessMethod = Database["public"]["Enums"]["process_method"];
export type LotStatus = Database["public"]["Enums"]["lot_status"];
export type Certification = Database["public"]["Enums"]["certification"];

export const PROCESS_LABELS: Record<ProcessMethod, string> = {
  washed: "Lavé",
  natural: "Nature",
  honey: "Honey",
  anaerobic: "Anaérobie",
  wet_hulled: "Wet hulled",
  carbonic_maceration: "Macération carbonique",
  other: "Autre",
};

export const STATUS_LABELS: Record<LotStatus, string> = {
  draft: "Brouillon",
  available: "Disponible",
  reserved: "Réservé",
  sold_out: "Épuisé",
};

export const CERTIFICATION_LABELS: Record<Certification, string> = {
  organic: "Bio",
  fairtrade: "Fair trade",
  rainforest_alliance: "Rainforest Alliance",
  utz: "UTZ",
  demeter: "Demeter",
  direct_trade: "Direct trade",
  none: "Aucune",
};

export const formatPrice = (amount: number, currency = "EUR") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
