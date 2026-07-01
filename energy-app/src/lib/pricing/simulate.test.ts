import { describe, expect, it } from "vitest";
import type { AnnualConsumption } from "@/lib/readings/consumption";
import {
  rankContracts,
  simulateAnnualCost,
  type ContractPricing,
} from "./simulate";

const ANNUAL: AnnualConsumption = {
  elecDayKwh: 2000,
  elecNightKwh: 1000,
  gasKwh: 10000,
  elecCoveredDays: 365,
  gasCoveredDays: 365,
};

function contract(overrides: Partial<ContractPricing>): ContractPricing {
  return {
    id: "c1",
    provider: "Fournisseur",
    offerName: "Offre",
    priceElecKwhDay: 0.12,
    priceElecKwhNight: 0.1,
    priceGasKwh: 0.04,
    fixedFeeElecAnnual: 100,
    fixedFeeGasAnnual: 60,
    isCurrentContract: false,
    ...overrides,
  };
}

describe("simulateAnnualCost", () => {
  it("calcule coût élec + gaz + redevances", () => {
    const cost = simulateAnnualCost(contract({}), ANNUAL);

    // 2000x0,12 + 1000x0,10 = 340 ; 10000x0,04 = 400 ; redevances 160
    expect(cost.elecCost).toBe(340);
    expect(cost.gasCost).toBe(400);
    expect(cost.fixedFees).toBe(160);
    expect(cost.totalAnnualCost).toBe(900);
  });

  it("applique le tarif jour à la conso nuit si l'offre est mono-horaire", () => {
    const cost = simulateAnnualCost(
      contract({ priceElecKwhNight: null }),
      ANNUAL,
    );

    // (2000 + 1000) x 0,12 = 360
    expect(cost.elecCost).toBe(360);
  });

  it("n'ajoute pas la redevance gaz à un profil sans gaz", () => {
    const cost = simulateAnnualCost(contract({}), {
      ...ANNUAL,
      gasKwh: null,
    });

    expect(cost.gasCost).toBe(0);
    expect(cost.fixedFees).toBe(100);
  });
});

describe("rankContracts", () => {
  it("classe du moins cher au plus cher avec l'écart vs contrat actuel", () => {
    const current = contract({
      id: "current",
      isCurrentContract: true,
      priceElecKwhDay: 0.15,
      priceElecKwhNight: 0.12,
      priceGasKwh: 0.05,
    });
    const cheaper = contract({ id: "cheaper" });
    const pricier = contract({
      id: "pricier",
      priceElecKwhDay: 0.2,
      priceGasKwh: 0.07,
    });

    const ranked = rankContracts([pricier, current, cheaper], ANNUAL);

    expect(ranked.map((r) => r.contract.id)).toEqual([
      "cheaper",
      "current",
      "pricier",
    ]);
    // actuel : 2000x0,15 + 1000x0,12 + 10000x0,05 + 160 = 1080
    expect(ranked.find((r) => r.contract.id === "current")!.cost.totalAnnualCost).toBe(1080);
    expect(ranked[0].savingsVsCurrentEur).toBe(180); // 1080 - 900
    expect(ranked[2].savingsVsCurrentEur).toBeLessThan(0);
  });

  it("retourne savings null sans contrat actuel défini", () => {
    const ranked = rankContracts([contract({})], ANNUAL);
    expect(ranked[0].savingsVsCurrentEur).toBeNull();
  });
});
