// Job d'import quotidien des offres marché VREG (open data officielle,
// pas de scraping de fournisseur). Voir src/lib/import/vreg.ts pour le
// parsing pur/testé ; ce script gère seulement le réseau et l'écriture
// Supabase. Lancé par .github/workflows/import-market-offers.yml.
//
// Usage : SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/import-market-offers.ts

import { createClient } from "@supabase/supabase-js";
import {
  VREG_PAGE_URL,
  findVregDataFileUrl,
  mapVregRowsToMarketOffers,
  parseLatestVregRows,
  yearMonthToIsoDate,
} from "../src/lib/import/vreg";

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis pour l'import",
    );
  }

  console.log(`Récupération de la page VREG : ${VREG_PAGE_URL}`);
  const pageRes = await fetch(VREG_PAGE_URL);
  if (!pageRes.ok) {
    throw new Error(`Échec chargement page VREG : HTTP ${pageRes.status}`);
  }
  const html = await pageRes.text();

  const fileUrl = findVregDataFileUrl(html);
  if (!fileUrl) {
    throw new Error("Lien du fichier V-test data introuvable sur la page VREG");
  }
  console.log(`Fichier trouvé : ${fileUrl}`);

  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) {
    throw new Error(`Échec téléchargement fichier VREG : HTTP ${fileRes.status}`);
  }
  const buffer = Buffer.from(await fileRes.arrayBuffer());

  const { rows, yearMonth } = parseLatestVregRows(buffer);
  console.log(`${rows.length} lignes lues pour la période ${yearMonth}`);

  const tariffUpdatedAt = yearMonthToIsoDate(yearMonth);
  const offers = mapVregRowsToMarketOffers(rows, fileUrl, tariffUpdatedAt);
  console.log(`${offers.length} offres marché mappées (${yearMonth})`);

  if (offers.length === 0) {
    console.log("Rien à importer, arrêt.");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { error, count } = await supabase
    .from("market_offers")
    .upsert(offers, { onConflict: "provider,offer_name", count: "exact" });

  if (error) {
    throw new Error(`Échec upsert Supabase : ${error.message}`);
  }
  console.log(`Import terminé : ${count ?? offers.length} offres upsertées.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
