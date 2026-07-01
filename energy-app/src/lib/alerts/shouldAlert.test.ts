import { describe, expect, it } from "vitest";
import type { RankedContract } from "@/lib/pricing/simulate";
import { contractsToAlert } from "./shouldAlert";

function ranked(
  id: string,
  savings: number | null,
  isCurrent = false,
): RankedContract {
  return {
    contract: {
      id,
      provider: "P",
      offerName: "O",
      priceElecKwhDay: 0.1,
      priceElecKwhNight: null,
      priceGasKwh: 0.04,
      fixedFeeElecAnnual: 0,
      fixedFeeGasAnnual: 0,
      isCurrentContract: isCurrent,
    },
    cost: { elecCost: 0, gasCost: 0, fixedFees: 0, totalAnnualCost: 0 },
    savingsVsCurrentEur: savings,
  };
}

describe("contractsToAlert", () => {
  it("retient les contrats dont l'économie atteint le seuil", () => {
    const result = contractsToAlert(
      [ranked("a", 150), ranked("b", 99.99), ranked("c", 100)],
      100,
      true,
    );

    expect(result.map((r) => r.contract.id)).toEqual(["a", "c"]);
  });

  it("exclut le contrat actuel et les économies inconnues", () => {
    const result = contractsToAlert(
      [ranked("current", 0, true), ranked("unknown", null)],
      0,
      true,
    );

    expect(result).toHaveLength(0);
  });

  it("ne retourne rien si les alertes sont désactivées", () => {
    expect(contractsToAlert([ranked("a", 500)], 100, false)).toHaveLength(0);
  });
});
