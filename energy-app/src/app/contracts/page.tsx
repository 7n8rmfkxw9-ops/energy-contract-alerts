"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ContractType, Database } from "@/types/database";
import {
  annualizeConsumption,
  computeConsumptionPeriods,
  DEFAULT_GAS_KWH_PER_M3,
} from "@/lib/readings/consumption";
import { rankContracts, type ContractPricing } from "@/lib/pricing/simulate";
import { parseDecimalInput } from "@/lib/forms/parseDecimal";
import { formatEur } from "@/lib/format";

type ContractRow = Database["public"]["Tables"]["contracts"]["Row"];
type ReadingRow = Database["public"]["Tables"]["meter_readings"]["Row"];
type MarketOfferRow = Database["public"]["Tables"]["market_offers"]["Row"];
type Supabase = ReturnType<typeof createClient>;

const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  fixed: "Fixe",
  variable: "Variable",
  dynamic: "Dynamique",
};

interface FormState {
  provider: string;
  offerName: string;
  contractType: ContractType;
  priceElecDay: string;
  priceElecNight: string;
  priceGas: string;
  feeElec: string;
  feeGas: string;
  commitmentMonths: string;
  sourceUrl: string;
  tariffUpdatedAt: string;
  isCurrent: boolean;
  notes: string;
}

const emptyForm = (): FormState => ({
  provider: "",
  offerName: "",
  contractType: "fixed",
  priceElecDay: "",
  priceElecNight: "",
  priceGas: "",
  feeElec: "0",
  feeGas: "0",
  commitmentMonths: "0",
  sourceUrl: "",
  tariffUpdatedAt: new Date().toISOString().slice(0, 10),
  isCurrent: false,
  notes: "",
});

function toPricing(row: ContractRow): ContractPricing {
  return {
    id: row.id,
    provider: row.provider,
    offerName: row.offer_name,
    priceElecKwhDay: row.price_elec_kwh_day,
    priceElecKwhNight: row.price_elec_kwh_night,
    priceGasKwh: row.price_gas_kwh,
    fixedFeeElecAnnual: row.fixed_fee_elec_annual,
    fixedFeeGasAnnual: row.fixed_fee_gas_annual,
    isCurrentContract: row.is_current_contract,
  };
}

// préfixées pour ne jamais entrer en collision avec un id `contracts`
// saisi manuellement dans le classement combiné.
function toMarketPricing(row: MarketOfferRow): ContractPricing {
  return {
    id: `market:${row.id}`,
    provider: row.provider,
    offerName: row.offer_name,
    priceElecKwhDay: row.price_elec_kwh_day,
    priceElecKwhNight: row.price_elec_kwh_night,
    priceGasKwh: row.price_gas_kwh,
    fixedFeeElecAnnual: row.fixed_fee_elec_annual,
    fixedFeeGasAnnual: row.fixed_fee_gas_annual,
    isCurrentContract: false,
  };
}

export default function ContractsPage() {
  const [supabase, setSupabase] = useState<Supabase | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [marketOffers, setMarketOffers] = useState<MarketOfferRow[]>([]);
  const [readings, setReadings] = useState<ReadingRow[]>([]);
  const [gasFactor, setGasFactor] = useState(DEFAULT_GAS_KWH_PER_M3);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrMatchedCount, setOcrMatchedCount] = useState<number | null>(null);

  const loadData = useCallback(async (client: Supabase) => {
    const [contractsRes, marketOffersRes, readingsRes, settingsRes] =
      await Promise.all([
        client.from("contracts").select("*").order("provider"),
        client.from("market_offers").select("*").order("provider"),
        client.from("meter_readings").select("*"),
        client.from("user_settings").select("*").maybeSingle(),
      ]);

    const firstError =
      contractsRes.error ??
      marketOffersRes.error ??
      readingsRes.error ??
      settingsRes.error;
    if (firstError) {
      setError(firstError.message);
      return;
    }
    setContracts(contractsRes.data ?? []);
    setMarketOffers(marketOffersRes.data ?? []);
    setReadings(readingsRes.data ?? []);
    if (settingsRes.data) setGasFactor(settingsRes.data.gas_kwh_per_m3);
  }, []);

  useEffect(() => {
    const client = createClient();
    setSupabase(client);
    client.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAuthChecked(true);
      if (data.user) void loadData(client);
    });
  }, [loadData]);

  const annual = useMemo(
    () =>
      annualizeConsumption(
        computeConsumptionPeriods(
          readings.map((r) => ({
            readingDate: r.reading_date,
            elecDayIndex: r.elec_day_index,
            elecNightIndex: r.elec_night_index,
            gasIndexM3: r.gas_index_m3,
          })),
          gasFactor,
        ),
      ),
    [readings, gasFactor],
  );

  const hasConsumptionProfile =
    annual.elecDayKwh !== null || annual.gasKwh !== null;

  const ranked = useMemo(
    () =>
      hasConsumptionProfile
        ? rankContracts(
            [
              ...contracts.map(toPricing),
              ...marketOffers.map(toMarketPricing),
            ],
            annual,
          )
        : [],
    [contracts, marketOffers, annual, hasConsumptionProfile],
  );

  async function handleImportDocument(file: File) {
    setOcrBusy(true);
    setOcrError(null);
    setOcrMatchedCount(null);

    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/import-contract", {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) {
        setOcrError(data.error ?? "Échec de l'extraction.");
        return;
      }

      const extraction = data.extraction as {
        provider: string | null;
        offerName: string | null;
        priceElecKwhDay: number | null;
        priceElecKwhNight: number | null;
        priceGasKwh: number | null;
        fixedFeeElecAnnual: number | null;
        fixedFeeGasAnnual: number | null;
        commitmentMonths: number | null;
        matchedFields: string[];
      };

      // ne remplace que les champs encore vides, pour ne jamais écraser
      // une saisie en cours.
      setForm((prev) => ({
        ...prev,
        provider: prev.provider || extraction.provider || "",
        offerName: prev.offerName || extraction.offerName || "",
        priceElecDay:
          prev.priceElecDay ||
          (extraction.priceElecKwhDay?.toString() ?? ""),
        priceElecNight:
          prev.priceElecNight ||
          (extraction.priceElecKwhNight?.toString() ?? ""),
        priceGas:
          prev.priceGas || (extraction.priceGasKwh?.toString() ?? ""),
        feeElec:
          extraction.fixedFeeElecAnnual !== null
            ? extraction.fixedFeeElecAnnual.toString()
            : prev.feeElec,
        feeGas:
          extraction.fixedFeeGasAnnual !== null
            ? extraction.fixedFeeGasAnnual.toString()
            : prev.feeGas,
        commitmentMonths:
          extraction.commitmentMonths !== null
            ? extraction.commitmentMonths.toString()
            : prev.commitmentMonths,
      }));
      setOcrMatchedCount(extraction.matchedFields.length);
    } catch {
      setOcrError("Échec de l'extraction (réseau ou serveur indisponible).");
    } finally {
      setOcrBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !userId) return;
    setError(null);

    const priceElecDay = parseDecimalInput(form.priceElecDay);
    const priceGas = parseDecimalInput(form.priceGas);
    if (priceElecDay === null || priceGas === null) {
      setError(
        "Prix élec jour et prix gaz obligatoires (mets 0 si l'offre ne couvre pas une énergie).",
      );
      return;
    }

    setBusy(true);

    // l'index unique n'autorise qu'un contrat actuel : on désactive
    // l'ancien avant d'enregistrer le nouveau.
    if (form.isCurrent) {
      const { error: unsetError } = await supabase
        .from("contracts")
        .update({ is_current_contract: false })
        .eq("user_id", userId)
        .eq("is_current_contract", true);
      if (unsetError) {
        setBusy(false);
        setError(unsetError.message);
        return;
      }
    }

    const payload = {
      user_id: userId,
      provider: form.provider.trim(),
      offer_name: form.offerName.trim(),
      contract_type: form.contractType,
      price_elec_kwh_day: priceElecDay,
      price_elec_kwh_night: parseDecimalInput(form.priceElecNight),
      price_gas_kwh: priceGas,
      fixed_fee_elec_annual: parseDecimalInput(form.feeElec) ?? 0,
      fixed_fee_gas_annual: parseDecimalInput(form.feeGas) ?? 0,
      commitment_months: Math.round(
        parseDecimalInput(form.commitmentMonths) ?? 0,
      ),
      source_url: form.sourceUrl.trim() || null,
      tariff_updated_at: form.tariffUpdatedAt,
      is_current_contract: form.isCurrent,
      notes: form.notes.trim() || null,
    };

    const { error } = editingId
      ? await supabase
          .from("contracts")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", editingId)
      : await supabase.from("contracts").insert(payload);

    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }

    setForm(emptyForm());
    setEditingId(null);
    await loadData(supabase);
  }

  function startEdit(row: ContractRow) {
    setEditingId(row.id);
    setForm({
      provider: row.provider,
      offerName: row.offer_name,
      contractType: row.contract_type,
      priceElecDay: row.price_elec_kwh_day.toString(),
      priceElecNight: row.price_elec_kwh_night?.toString() ?? "",
      priceGas: row.price_gas_kwh.toString(),
      feeElec: row.fixed_fee_elec_annual.toString(),
      feeGas: row.fixed_fee_gas_annual.toString(),
      commitmentMonths: row.commitment_months.toString(),
      sourceUrl: row.source_url ?? "",
      tariffUpdatedAt: row.tariff_updated_at,
      isCurrent: row.is_current_contract,
      notes: row.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!supabase) return;
    if (!window.confirm("Supprimer cette offre ?")) return;
    const { error } = await supabase.from("contracts").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm());
    }
    await loadData(supabase);
  }

  async function setAsCurrent(id: string) {
    if (!supabase || !userId) return;
    setError(null);
    const { error: unsetError } = await supabase
      .from("contracts")
      .update({ is_current_contract: false })
      .eq("user_id", userId)
      .eq("is_current_contract", true);
    if (unsetError) {
      setError(unsetError.message);
      return;
    }
    const { error } = await supabase
      .from("contracts")
      .update({ is_current_contract: true })
      .eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    await loadData(supabase);
  }

  if (!authChecked) {
    return <main className="p-8 text-slate-500">Chargement…</main>;
  }

  if (!userId) {
    return (
      <main className="page max-w-xl">
        <p>
          Tu dois être connecté pour gérer les offres.{" "}
          <Link href="/auth" className="text-brand-600 underline">
            Se connecter
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="page max-w-5xl">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          Tarifs
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Base de tarifs</h1>
        <p className="mt-1 text-sm text-slate-600">
          Les offres marché (fixes, élec + gaz) sont importées
          automatiquement chaque jour depuis l&apos;open data VREG
          (V-test®). Utilise le formulaire ci-dessous seulement pour ton
          contrat actuel, ou une offre non couverte par l&apos;import.
          Chaque offre est comparée sur ta consommation réelle, pas sur un
          profil moyen.
        </p>
      </header>

      <section className="card">
        <h2 className="text-lg font-semibold tracking-tight">
          Importer mon contrat actuel
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Dépose une fiche tarifaire (PDF), une facture ou une photo de ton
          contrat : les prix sont extraits automatiquement et préremplissent
          le formulaire ci-dessous — vérifie-les avant d&apos;enregistrer.
          Traitement 100&nbsp;% local, rien n&apos;est envoyé à un service
          tiers.
        </p>
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          disabled={ocrBusy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleImportDocument(file);
          }}
          className="field mt-3"
        />
        {ocrBusy && (
          <p className="mt-2 text-sm text-slate-500">
            Analyse du document en cours…
          </p>
        )}
        {ocrError && <p className="mt-2 text-sm text-red-600">{ocrError}</p>}
        {ocrMatchedCount !== null && !ocrBusy && !ocrError && (
          <p className="mt-2 text-sm text-emerald-700">
            {ocrMatchedCount > 0
              ? `${ocrMatchedCount} champ${ocrMatchedCount > 1 ? "s" : ""} détecté${ocrMatchedCount > 1 ? "s" : ""} automatiquement. Vérifie les valeurs dans le formulaire ci-dessous avant d'enregistrer.`
              : "Aucun champ reconnu automatiquement — complète le formulaire manuellement."}
          </p>
        )}
      </section>

      <form
        onSubmit={handleSubmit}
        className="card grid gap-4 sm:grid-cols-3"
      >
        <h2 className="text-lg font-semibold tracking-tight sm:col-span-3">
          {editingId ? "Modifier l'offre" : "Nouvelle offre"}
        </h2>

        <label className="block">
          <span className="text-sm font-medium">Fournisseur</span>
          <input
            type="text"
            required
            placeholder="ex : Engie"
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value })}
            className="field"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Nom de l&apos;offre</span>
          <input
            type="text"
            required
            placeholder="ex : Easy Fixed"
            value={form.offerName}
            onChange={(e) => setForm({ ...form, offerName: e.target.value })}
            className="field"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Type</span>
          <select
            value={form.contractType}
            onChange={(e) =>
              setForm({ ...form, contractType: e.target.value as ContractType })
            }
            className="field bg-white"
          >
            {Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Prix élec jour (€/kWh)</span>
          <input
            type="text"
            inputMode="decimal"
            required
            placeholder="ex : 0,12"
            value={form.priceElecDay}
            onChange={(e) =>
              setForm({ ...form, priceElecDay: e.target.value })
            }
            className="field"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">
            Prix élec nuit (€/kWh, si bi-horaire)
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={form.priceElecNight}
            onChange={(e) =>
              setForm({ ...form, priceElecNight: e.target.value })
            }
            className="field"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Prix gaz (€/kWh)</span>
          <input
            type="text"
            inputMode="decimal"
            required
            placeholder="ex : 0,04"
            value={form.priceGas}
            onChange={(e) => setForm({ ...form, priceGas: e.target.value })}
            className="field"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Redevance élec (€/an)</span>
          <input
            type="text"
            inputMode="decimal"
            value={form.feeElec}
            onChange={(e) => setForm({ ...form, feeElec: e.target.value })}
            className="field"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Redevance gaz (€/an)</span>
          <input
            type="text"
            inputMode="decimal"
            value={form.feeGas}
            onChange={(e) => setForm({ ...form, feeGas: e.target.value })}
            className="field"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Engagement (mois)</span>
          <input
            type="text"
            inputMode="numeric"
            value={form.commitmentMonths}
            onChange={(e) =>
              setForm({ ...form, commitmentMonths: e.target.value })
            }
            className="field"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">
            Lien fiche tarifaire / souscription
          </span>
          <input
            type="url"
            placeholder="https://…"
            value={form.sourceUrl}
            onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
            className="field"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Tarif à jour au</span>
          <input
            type="date"
            required
            value={form.tariffUpdatedAt}
            onChange={(e) =>
              setForm({ ...form, tariffUpdatedAt: e.target.value })
            }
            className="field"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Notes</span>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="field"
          />
        </label>

        <label className="flex items-center gap-2 self-end pb-2">
          <input
            type="checkbox"
            checked={form.isCurrent}
            onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })}
          />
          <span className="text-sm font-medium">
            C&apos;est mon contrat actuel
          </span>
        </label>

        {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}

        <div className="flex gap-3 sm:col-span-3">
          <button
            type="submit"
            disabled={busy}
            className="btn-primary"
          >
            {editingId ? "Enregistrer" : "Ajouter l'offre"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm());
              }}
              className="btn-secondary"
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">
          Classement sur ta consommation réelle
        </h2>
        {!hasConsumptionProfile ? (
          <p className="mt-2 text-sm text-slate-500">
            Ajoute au moins deux{" "}
            <Link href="/readings" className="underline">
              relevés de compteur
            </Link>{" "}
            pour estimer ta consommation annuelle et comparer les offres.
          </p>
        ) : ranked.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Aucune offre saisie pour l&apos;instant.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-600">
              Profil estimé :{" "}
              {annual.elecDayKwh !== null &&
                `élec ${Math.round(annual.elecDayKwh + (annual.elecNightKwh ?? 0))} kWh/an`}
              {annual.elecDayKwh !== null && annual.gasKwh !== null && " · "}
              {annual.gasKwh !== null &&
                `gaz ${Math.round(annual.gasKwh)} kWh/an`}
              {" "}(extrapolé sur {Math.max(annual.elecCoveredDays, annual.gasCoveredDays)}{" "}
              jours de relevés).
            </p>
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-left">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Offre</th>
                  <th className="py-2 pr-4">Coût estimé /an</th>
                  <th className="py-2 pr-4">Écart vs actuel</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r, i) => (
                  <tr
                    key={r.contract.id}
                    className={`border-b border-slate-100 ${r.contract.isCurrentContract ? "bg-brand-50/60 font-semibold" : ""}`}
                  >
                    <td className="py-2 pr-4">{i + 1}</td>
                    <td className="py-2 pr-4">
                      {r.contract.provider} — {r.contract.offerName}
                      {r.contract.isCurrentContract && (
                        <span className="ml-2 rounded bg-slate-200 px-2 py-0.5 text-xs">
                          actuel
                        </span>
                      )}
                      {r.contract.id.startsWith("market:") && (
                        <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                          marché · VREG
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {formatEur(r.cost.totalAnnualCost)}
                    </td>
                    <td className="py-2 pr-4">
                      {r.contract.isCurrentContract ||
                      r.savingsVsCurrentEur === null ? (
                        "—"
                      ) : r.savingsVsCurrentEur > 0 ? (
                        <span className="text-green-700">
                          −{formatEur(r.savingsVsCurrentEur)}
                        </span>
                      ) : (
                        <span className="text-red-600">
                          +{formatEur(-r.savingsVsCurrentEur)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Offres saisies</h2>
        {contracts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Aucune offre. Commence par saisir ton contrat actuel (coche
            &laquo;&nbsp;C&apos;est mon contrat actuel&nbsp;&raquo;), puis
            ajoute les offres concurrentes.
          </p>
        ) : (
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className="py-2 pr-4">Offre</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Élec jour/nuit (€/kWh)</th>
                <th className="py-2 pr-4">Gaz (€/kWh)</th>
                <th className="py-2 pr-4">Redevances (€/an)</th>
                <th className="py-2 pr-4">Tarif au</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {contracts.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">
                    {row.provider} — {row.offer_name}
                    {row.is_current_contract && (
                      <span className="ml-2 rounded bg-slate-200 px-2 py-0.5 text-xs">
                        actuel
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {CONTRACT_TYPE_LABELS[row.contract_type]}
                  </td>
                  <td className="py-2 pr-4">
                    {row.price_elec_kwh_day}
                    {row.price_elec_kwh_night !== null &&
                      ` / ${row.price_elec_kwh_night}`}
                  </td>
                  <td className="py-2 pr-4">{row.price_gas_kwh}</td>
                  <td className="py-2 pr-4">
                    {row.fixed_fee_elec_annual} + {row.fixed_fee_gas_annual}
                  </td>
                  <td className="py-2 pr-4">{row.tariff_updated_at}</td>
                  <td className="py-2 text-right">
                    {!row.is_current_contract && (
                      <button
                        onClick={() => setAsCurrent(row.id)}
                        className="mr-3 link-muted"
                      >
                        Définir actuel
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(row)}
                      className="mr-3 link-muted"
                    >
                      Éditer
                    </button>
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="btn-danger-link"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">
          Offres marché (import automatique VREG)
        </h2>
        {marketOffers.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Aucune offre importée pour l&apos;instant (le job tourne une
            fois par jour).
          </p>
        ) : (
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className="py-2 pr-4">Offre</th>
                <th className="py-2 pr-4">Élec jour/nuit (€/kWh)</th>
                <th className="py-2 pr-4">Gaz (€/kWh)</th>
                <th className="py-2 pr-4">Redevances (€/an)</th>
                <th className="py-2 pr-4">Tarif au</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {marketOffers.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">
                    {row.provider} — {row.offer_name}
                  </td>
                  <td className="py-2 pr-4">
                    {row.price_elec_kwh_day}
                    {row.price_elec_kwh_night !== null &&
                      ` / ${row.price_elec_kwh_night}`}
                  </td>
                  <td className="py-2 pr-4">{row.price_gas_kwh}</td>
                  <td className="py-2 pr-4">
                    {row.fixed_fee_elec_annual} + {row.fixed_fee_gas_annual}
                  </td>
                  <td className="py-2 pr-4">{row.tariff_updated_at}</td>
                  <td className="py-2 text-right">
                    {row.source_url && (
                      <a
                        href={row.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="link-muted"
                      >
                        Source
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
