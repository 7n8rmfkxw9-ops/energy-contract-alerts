// Helpers purs pour la fonction verify-vat.
// Pas d'import Deno/Supabase — testable depuis Vitest.

/**
 * Normalise un numéro de TVA pour l'envoi à VIES.
 * - Retire les caractères non alphanumériques (espaces, tirets, points).
 * - Met en majuscules.
 * - Retire le préfixe pays s'il est déjà présent (ex: "FR12345" -> "12345"
 *   pour countryCode "FR").
 */
export const normalizeVatNumber = (vatNumber: string, countryCode: string): string => {
  let normalized = vatNumber.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const upperCountry = countryCode.toUpperCase();
  if (normalized.startsWith(upperCountry)) {
    normalized = normalized.slice(upperCountry.length);
  }
  return normalized;
};
