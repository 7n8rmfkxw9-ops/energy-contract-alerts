import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  findVregDataFileUrl,
  mapVregRowsToMarketOffers,
  parseLatestVregRows,
  yearMonthToIsoDate,
  type VregRow,
} from "./vreg";

describe("yearMonthToIsoDate", () => {
  it("convertit une combinaison année-mois VREG en date ISO", () => {
    expect(yearMonthToIsoDate("2026-mei")).toBe("2026-05-01");
    expect(yearMonthToIsoDate("2025-dec")).toBe("2025-12-01");
    expect(yearMonthToIsoDate("2026-jan")).toBe("2026-01-01");
  });

  it("lève une erreur pour un mois inconnu", () => {
    expect(() => yearMonthToIsoDate("2026-xyz")).toThrow();
  });
});

describe("findVregDataFileUrl", () => {
  it("extrait l'URL du fichier V-test data depuis le HTML de la page", () => {
    const html = `<a href="https://assets.vlaamsenutsregulator.be/2026-05/202605-v-test-data-exclbtw%20v2_0.xlsx?VersionId=abc">Klik hier</a>`;
    expect(findVregDataFileUrl(html)).toBe(
      "https://assets.vlaamsenutsregulator.be/2026-05/202605-v-test-data-exclbtw%20v2_0.xlsx?VersionId=abc",
    );
  });

  it("retourne null si aucun lien ne correspond", () => {
    expect(findVregDataFileUrl("<html>rien ici</html>")).toBeNull();
  });
});

function buildWorkbook(rows: (string | number)[][], sheetName: string) {
  const header = [
    "Jaar",
    "Maand",
    "Segment",
    "Energietype",
    "Contracttype",
    "Handelsnaam",
    "Productnaam",
    "Vast/variabel/dynamisch",
    "Prijsonderdeel",
    "Prijs",
  ];
  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("parseLatestVregRows", () => {
  it("lit l'onglet de l'année en cours et ne garde que le dernier mois", () => {
    const buffer = buildWorkbook(
      [
        [
          "2026",
          "jan",
          "Woning",
          "Elektriciteit",
          "Afname",
          "Bolt",
          "Bolt Vast",
          "Vast",
          "Vaste vergoeding (€)",
          "100",
        ],
        [
          "2026",
          "mei",
          "Woning",
          "Elektriciteit",
          "Afname",
          "Bolt",
          "Bolt Vast",
          "Vast",
          "Vaste vergoeding (€)",
          "124.42",
        ],
      ],
      "Vast (excl. btw) (2026)",
    );

    const { rows, yearMonth } = parseLatestVregRows(buffer);

    expect(yearMonth).toBe("2026-mei");
    expect(rows).toHaveLength(1);
    expect(rows[0].prijs).toBe(124.42);
  });

  it("choisit l'onglet de l'année la plus récente s'il y en a plusieurs", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        [
          "Jaar",
          "Maand",
          "Segment",
          "Energietype",
          "Contracttype",
          "Handelsnaam",
          "Productnaam",
          "Vast/variabel/dynamisch",
          "Prijsonderdeel",
          "Prijs",
        ],
        [
          "2025",
          "dec",
          "Woning",
          "Gas",
          "Afname",
          "OldCo",
          "Old Vast",
          "Vast",
          "Vaste vergoeding (€)",
          "50",
        ],
      ]),
      "Vast (excl. btw) (2025)",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        [
          "Jaar",
          "Maand",
          "Segment",
          "Energietype",
          "Contracttype",
          "Handelsnaam",
          "Productnaam",
          "Vast/variabel/dynamisch",
          "Prijsonderdeel",
          "Prijs",
        ],
        [
          "2026",
          "feb",
          "Woning",
          "Gas",
          "Afname",
          "NewCo",
          "New Vast",
          "Vast",
          "Vaste vergoeding (€)",
          "60",
        ],
      ]),
      "Vast (excl. btw) (2026)",
    );
    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    }) as Buffer;

    const { yearMonth, rows } = parseLatestVregRows(buffer);
    expect(yearMonth).toBe("2026-feb");
    expect(rows[0].handelsnaam).toBe("NewCo");
  });
});

describe("mapVregRowsToMarketOffers", () => {
  function row(overrides: Partial<VregRow>): VregRow {
    return {
      jaar: "2026",
      maand: "mei",
      segment: "Woning",
      energietype: "Elektriciteit",
      contracttype: "Afname",
      handelsnaam: "Bolt",
      productnaam: "Bolt Vast",
      prijsonderdeel: "Tweevoudige meter dagtarief (c€/kWh)",
      prijs: 14.4,
      ...overrides,
    };
  }

  it("combine les lignes élec + gaz d'un même fournisseur/produit en une offre", () => {
    const rows: VregRow[] = [
      row({ prijsonderdeel: "Tweevoudige meter dagtarief (c€/kWh)", prijs: 14.4 }),
      row({
        prijsonderdeel: "Tweevoudige meter nachttarief (c€/kWh)",
        prijs: 12.0,
      }),
      row({ prijsonderdeel: "Kosten groene stroom (c€/kWh)", prijs: 1.1 }),
      row({ prijsonderdeel: "Kosten WKK (c€/kWh)", prijs: 0.36 }),
      row({ prijsonderdeel: "Vaste vergoeding (€)", prijs: 124.42 }),
      row({
        energietype: "Gas",
        prijsonderdeel: "Enkelvoudige meter dagtarief (c€/kWh)",
        prijs: 5.65,
      }),
      row({
        energietype: "Gas",
        prijsonderdeel: "Vaste vergoeding (€)",
        prijs: 67.81,
      }),
    ];

    const offers = mapVregRowsToMarketOffers(
      rows,
      "https://vreg.example/file.xlsx",
      "2026-05-01",
    );

    expect(offers).toHaveLength(1);
    const [offer] = offers;
    expect(offer.provider).toBe("Bolt");
    expect(offer.offer_name).toBe("Bolt Vast");
    expect(offer.contract_type).toBe("fixed");
    // (14.4 + 1.1 + 0.36) / 100
    expect(offer.price_elec_kwh_day).toBeCloseTo(0.1586, 4);
    // (12.0 + 1.1 + 0.36) / 100
    expect(offer.price_elec_kwh_night).toBeCloseTo(0.1346, 4);
    expect(offer.price_gas_kwh).toBeCloseTo(0.0565, 4);
    expect(offer.fixed_fee_elec_annual).toBe(124.42);
    expect(offer.fixed_fee_gas_annual).toBe(67.81);
    expect(offer.source_url).toBe("https://vreg.example/file.xlsx");
    expect(offer.tariff_updated_at).toBe("2026-05-01");
  });

  it("ignore les fournisseurs qui n'ont que l'élec ou que le gaz", () => {
    const rows: VregRow[] = [
      row({ prijsonderdeel: "Tweevoudige meter dagtarief (c€/kWh)" }),
      row({ prijsonderdeel: "Tweevoudige meter nachttarief (c€/kWh)" }),
      // pas de ligne gaz pour ce fournisseur/produit
    ];

    expect(mapVregRowsToMarketOffers(rows, "url", "2026-05-01")).toHaveLength(
      0,
    );
  });

  it("ignore les segments non résidentiels et les injections", () => {
    const rows: VregRow[] = [
      row({ segment: "Onderneming" }),
      row({ contracttype: "Injectie" }),
    ];

    expect(mapVregRowsToMarketOffers(rows, "url", "2026-05-01")).toHaveLength(
      0,
    );
  });
});
