import type { AnnualConsumption } from "@/lib/readings/consumption";

/**
 * Simulation du coût annuel d'un contrat sur le profil de consommation
 * réel de l'utilisateur (annualisé à partir de ses relevés d'index).
 *
 * Sous-ensemble des colonnes de la table `contracts` nécessaire au calcul,
 * pour rester testable sans Supabase.
 */
export interface ContractPricing {
  id: string;
  provider: string;
  offerName: string;
  priceElecKwhDay: number;
  priceElecKwhNight: number | null;
  priceGasKwh: number;
  fixedFeeElecAnnual: number;
  fixedFeeGasAnnual: number;
  isCurrentContract: boolean;
}

export interface CostBreakdown {
  elecCost: number;
  gasCost: number;
  fixedFees: number;
  totalAnnualCost: number;
}

export interface RankedContract {
  contract: ContractPricing;
  cost: CostBreakdown;
  /** Économie en €/an vs le contrat actuel (positif = moins cher). Null si pas de contrat actuel. */
  savingsVsCurrentEur: number | null;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export function simulateAnnualCost(
  contract: ContractPricing,
  annual: AnnualConsumption,
): CostBreakdown {
  const elecDay = annual.elecDayKwh ?? 0;
  const elecNight = annual.elecNightKwh ?? 0;
  // offre mono-horaire sur compteur bi-horaire : tout au tarif unique
  const nightPrice = contract.priceElecKwhNight ?? contract.priceElecKwhDay;

  const elecCost =
    elecDay * contract.priceElecKwhDay + elecNight * nightPrice;
  const gasCost = (annual.gasKwh ?? 0) * contract.priceGasKwh;

  // les redevances fixes ne comptent que pour les énergies réellement
  // consommées, sinon un profil sans gaz serait pénalisé par la redevance
  // gaz des offres duales.
  const hasElec = elecDay + elecNight > 0;
  const hasGas = (annual.gasKwh ?? 0) > 0;
  const fixedFees =
    (hasElec ? contract.fixedFeeElecAnnual : 0) +
    (hasGas ? contract.fixedFeeGasAnnual : 0);

  return {
    elecCost: round2(elecCost),
    gasCost: round2(gasCost),
    fixedFees: round2(fixedFees),
    totalAnnualCost: round2(elecCost + gasCost + fixedFees),
  };
}

/**
 * Classe les contrats du moins cher au plus cher pour le profil donné,
 * avec l'écart en €/an vs le contrat marqué "actuel".
 */
export function rankContracts(
  contracts: ContractPricing[],
  annual: AnnualConsumption,
): RankedContract[] {
  const simulated = contracts.map((contract) => ({
    contract,
    cost: simulateAnnualCost(contract, annual),
  }));

  const current = simulated.find((s) => s.contract.isCurrentContract);

  return simulated
    .map((s) => ({
      ...s,
      savingsVsCurrentEur: current
        ? round2(current.cost.totalAnnualCost - s.cost.totalAnnualCost)
        : null,
    }))
    .sort((a, b) => a.cost.totalAnnualCost - b.cost.totalAnnualCost);
}
