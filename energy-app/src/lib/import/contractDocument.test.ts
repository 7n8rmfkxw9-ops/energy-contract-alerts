import { describe, expect, it } from "vitest";
import { extractContractFromText } from "./contractDocument";

describe("extractContractFromText", () => {
  it("extrait les champs d'une fiche tarifaire standardisée (FR)", () => {
    const text = `
      FICHE TARIFAIRE
      Fournisseur : Luminus
      Nom du produit : BasicFix Online

      Électricité
      Tarif jour : 0,1879 €/kWh
      Tarif nuit : 0,1519 €/kWh
      Redevance annuelle électricité : 23,58 €

      Gaz naturel
      Prix du gaz : 0,0620 €/kWh
      Redevance annuelle gaz : 18,87 €

      Durée d'engagement : 12 mois
    `;

    const result = extractContractFromText(text);

    expect(result.provider).toBe("Luminus");
    expect(result.offerName).toBe("BasicFix Online");
    expect(result.priceElecKwhDay).toBeCloseTo(0.1879, 4);
    expect(result.priceElecKwhNight).toBeCloseTo(0.1519, 4);
    expect(result.priceGasKwh).toBeCloseTo(0.062, 4);
    expect(result.fixedFeeElecAnnual).toBe(23.58);
    expect(result.fixedFeeGasAnnual).toBe(18.87);
    expect(result.commitmentMonths).toBe(12);
    expect(result.matchedFields).toHaveLength(8);
  });

  it("convertit les prix exprimés en c€/kWh (cents)", () => {
    const text = `
      Fournisseur : Bolt
      Tarif jour : 14,40 c€/kWh
      Prix du gaz : 5,65 c€/kWh
    `;

    const result = extractContractFromText(text);

    expect(result.priceElecKwhDay).toBeCloseTo(0.144, 4);
    expect(result.priceGasKwh).toBeCloseTo(0.0565, 4);
  });

  it("retourne des champs null quand rien n'est trouvé", () => {
    const result = extractContractFromText("Ceci est un document sans rapport.");

    expect(result.provider).toBeNull();
    expect(result.priceElecKwhDay).toBeNull();
    expect(result.matchedFields).toHaveLength(0);
  });

  it("reste tolérant face à une mise en page libre (facture)", () => {
    const text = `
      Votre facture Engie

      Consommation électricité — prix jour 0,1852 €/kWh, prix nuit 0,1558 €/kWh
      Redevance électricité 65,09 €
      Gaz naturel : prix 0,0636 €/kWh, redevance 56,60 €
    `;

    const result = extractContractFromText(text);

    expect(result.provider).toBe("Engie");
    expect(result.priceElecKwhDay).toBeCloseTo(0.1852, 4);
    expect(result.priceElecKwhNight).toBeCloseTo(0.1558, 4);
    expect(result.priceGasKwh).toBeCloseTo(0.0636, 4);
    expect(result.fixedFeeElecAnnual).toBe(65.09);
    expect(result.fixedFeeGasAnnual).toBe(56.6);
  });
});
