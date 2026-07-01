import type { RankedContract } from "@/lib/pricing/simulate";

/**
 * Décide quels contrats méritent une alerte : économie vs contrat actuel
 * supérieure ou égale au seuil configuré, alertes activées, et pas le
 * contrat actuel lui-même.
 *
 * L'alerte se limite à informer (lien fournisseur + résumé chiffré) —
 * aucune souscription automatique n'est déclenchée par l'application.
 */
export function contractsToAlert(
  ranked: RankedContract[],
  thresholdEurPerYear: number,
  alertsEnabled: boolean,
): RankedContract[] {
  if (!alertsEnabled) return [];

  return ranked.filter(
    (r) =>
      !r.contract.isCurrentContract &&
      r.savingsVsCurrentEur !== null &&
      r.savingsVsCurrentEur >= thresholdEurPerYear,
  );
}
