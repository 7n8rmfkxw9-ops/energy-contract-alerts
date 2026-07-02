"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import {
  annualizeConsumption,
  computeConsumptionPeriods,
  daysSinceLastReading,
  DEFAULT_GAS_KWH_PER_M3,
  isReadingReminderDue,
} from "@/lib/readings/consumption";
import { rankContracts, type ContractPricing } from "@/lib/pricing/simulate";
import { parseDecimalInput } from "@/lib/forms/parseDecimal";
import { formatEur } from "@/lib/format";

type ContractRow = Database["public"]["Tables"]["contracts"]["Row"];
type ReadingRow = Database["public"]["Tables"]["meter_readings"]["Row"];
type SettingsRow = Database["public"]["Tables"]["user_settings"]["Row"];
type AlertRow = Database["public"]["Tables"]["alerts"]["Row"];
type Supabase = ReturnType<typeof createClient>;

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

interface SettingsForm {
  threshold: string;
  reminderDays: string;
  gasFactor: string;
  notifyEmail: string;
  alertsEnabled: boolean;
}

function StatTile({
  label,
  value,
  detail,
  href,
  accent,
}: {
  label: string;
  value: string;
  detail?: React.ReactNode;
  href?: string;
  accent?: "positive";
}) {
  const body = (
    <div
      className={`card p-4 transition ${href ? "hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md" : ""}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1.5 text-2xl font-bold tracking-tight ${accent === "positive" ? "text-emerald-600" : "text-slate-900"}`}
      >
        {value}
      </p>
      {detail && <div className="mt-1 text-sm text-slate-600">{detail}</div>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default function DashboardPage() {
  const [supabase, setSupabase] = useState<Supabase | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [readings, setReadings] = useState<ReadingRow[]>([]);
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [settingsForm, setSettingsForm] = useState<SettingsForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async (client: Supabase) => {
    const [contractsRes, readingsRes, settingsRes, alertsRes] =
      await Promise.all([
        client.from("contracts").select("*"),
        client.from("meter_readings").select("*"),
        client.from("user_settings").select("*").maybeSingle(),
        client
          .from("alerts")
          .select("*")
          .order("sent_at", { ascending: false })
          .limit(20),
      ]);

    const firstError =
      contractsRes.error ??
      readingsRes.error ??
      settingsRes.error ??
      alertsRes.error;
    if (firstError) {
      setError(firstError.message);
      return;
    }
    setContracts(contractsRes.data ?? []);
    setReadings(readingsRes.data ?? []);
    setSettings(settingsRes.data);
    setAlerts(alertsRes.data ?? []);
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

  useEffect(() => {
    setSettingsForm({
      threshold: (settings?.threshold_eur_per_year ?? 100).toString(),
      reminderDays: (settings?.reading_reminder_days ?? 30).toString(),
      gasFactor: (
        settings?.gas_kwh_per_m3 ?? DEFAULT_GAS_KWH_PER_M3
      ).toString(),
      notifyEmail: settings?.notify_email ?? "",
      alertsEnabled: settings?.alerts_enabled ?? true,
    });
  }, [settings]);

  const gasFactor = settings?.gas_kwh_per_m3 ?? DEFAULT_GAS_KWH_PER_M3;
  const reminderDays = settings?.reading_reminder_days ?? 30;

  const readingInputs = useMemo(
    () =>
      readings.map((r) => ({
        readingDate: r.reading_date,
        elecDayIndex: r.elec_day_index,
        elecNightIndex: r.elec_night_index,
        gasIndexM3: r.gas_index_m3,
      })),
    [readings],
  );

  const annual = useMemo(
    () =>
      annualizeConsumption(
        computeConsumptionPeriods(readingInputs, gasFactor),
      ),
    [readingInputs, gasFactor],
  );

  const hasProfile = annual.elecDayKwh !== null || annual.gasKwh !== null;

  const ranked = useMemo(
    () => (hasProfile ? rankContracts(contracts.map(toPricing), annual) : []),
    [contracts, annual, hasProfile],
  );

  const current = ranked.find((r) => r.contract.isCurrentContract) ?? null;
  const best = ranked.find((r) => !r.contract.isCurrentContract) ?? null;
  const potentialSavings =
    best && current ? current.cost.totalAnnualCost - best.cost.totalAnnualCost : null;

  const daysSince = useMemo(
    () =>
      daysSinceLastReading(readingInputs, new Date().toISOString().slice(0, 10)),
    [readingInputs],
  );
  const reminderDue = isReadingReminderDue(daysSince, reminderDays);

  const contractName = (id: string) => {
    const c = contracts.find((c) => c.id === id);
    return c ? `${c.provider} — ${c.offer_name}` : "(offre supprimée)";
  };

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !userId || !settingsForm) return;
    setError(null);
    setSavedNote(false);

    const threshold = parseDecimalInput(settingsForm.threshold);
    const reminder = parseDecimalInput(settingsForm.reminderDays);
    const factor = parseDecimalInput(settingsForm.gasFactor);
    if (threshold === null || reminder === null || factor === null) {
      setError("Seuil, rappel et coefficient gaz doivent être des nombres positifs.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: userId,
        threshold_eur_per_year: threshold,
        reading_reminder_days: Math.round(reminder),
        gas_kwh_per_m3: factor,
        notify_email: settingsForm.notifyEmail.trim() || null,
        alerts_enabled: settingsForm.alertsEnabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSavedNote(true);
    await loadData(supabase);
  }

  if (!authChecked) {
    return <main className="p-8 text-slate-500">Chargement…</main>;
  }

  if (!userId) {
    return (
      <main className="page max-w-xl">
        <h1 className="text-2xl font-bold tracking-tight">
          Volt<span className="text-spark-500">Watch</span>
        </h1>
        <p className="mt-2 text-slate-600">
          Suivi de consommation par relevés d&apos;index (compteur analogique)
          et comparaison de contrats d&apos;énergie sur ton profil réel.
        </p>
        <p className="mt-4">
          <Link href="/auth" className="btn-primary inline-block">
            Se connecter pour commencer
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="page max-w-5xl">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          Tableau de bord
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          Salut <span aria-hidden="true">👋</span>
        </h1>
      </header>

      {reminderDue && (
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <span aria-hidden="true">⚠️</span>
          {daysSince === null
            ? "Aucun relevé enregistré : commence par relever tes compteurs."
            : `Dernier relevé il y a ${daysSince} jours (rappel réglé à ${reminderDays} jours) : pense à relever tes compteurs.`}
          <Link href="/readings" className="font-medium text-amber-900 underline">
            Saisir un relevé
          </Link>
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Dernier relevé"
          value={
            daysSince === null
              ? "—"
              : daysSince === 0
                ? "aujourd'hui"
                : `il y a ${daysSince} j`
          }
          detail={`${readings.length} relevé${readings.length > 1 ? "s" : ""} enregistré${readings.length > 1 ? "s" : ""}`}
          href="/readings"
        />
        <StatTile
          label="Coût annuel estimé (contrat actuel)"
          value={current ? formatEur(current.cost.totalAnnualCost) : "—"}
          detail={
            current
              ? `${current.contract.provider} — ${current.contract.offerName}`
              : "Définis ton contrat actuel dans la base de tarifs"
          }
          href="/contracts"
        />
        <StatTile
          label="Meilleure offre du marché"
          value={best ? formatEur(best.cost.totalAnnualCost) : "—"}
          detail={
            best
              ? `${best.contract.provider} — ${best.contract.offerName}`
              : "Ajoute des offres concurrentes pour comparer"
          }
          href="/contracts"
        />
        <StatTile
          label="Économie potentielle"
          value={
            potentialSavings !== null && potentialSavings > 0
              ? `${formatEur(potentialSavings)}/an`
              : potentialSavings !== null
                ? "aucune"
                : "—"
          }
          detail={
            potentialSavings !== null && potentialSavings > 0
              ? `en passant chez ${best!.contract.provider}`
              : potentialSavings !== null
                ? "ton contrat actuel est le moins cher"
                : undefined
          }
          accent={
            potentialSavings !== null && potentialSavings > 0
              ? "positive"
              : undefined
          }
        />
      </section>

      {hasProfile && (
        <p className="text-sm text-slate-600">
          Profil de consommation estimé :{" "}
          {annual.elecDayKwh !== null &&
            `électricité ${Math.round(annual.elecDayKwh + (annual.elecNightKwh ?? 0))} kWh/an`}
          {annual.elecDayKwh !== null && annual.gasKwh !== null && " · "}
          {annual.gasKwh !== null && `gaz ${Math.round(annual.gasKwh)} kWh/an`}{" "}
          — extrapolé sur{" "}
          {Math.max(annual.elecCoveredDays, annual.gasCoveredDays)} jours de
          relevés. Plus la période couverte est longue (idéalement une année
          complète), plus l&apos;estimation est fiable.
        </p>
      )}

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Historique des alertes</h2>
        {alerts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Aucune alerte envoyée pour l&apos;instant. Une alerte email part
            quand une offre de la base dépasse ton seuil d&apos;économie.
          </p>
        ) : (
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Offre</th>
                <th className="py-2 pr-4">Économie</th>
                <th className="py-2 pr-4">Seuil</th>
                <th className="py-2 pr-4">Statut</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">
                    {new Date(a.sent_at).toLocaleDateString("fr-BE")}
                  </td>
                  <td className="py-2 pr-4">{contractName(a.contract_id)}</td>
                  <td className="py-2 pr-4">{formatEur(a.savings_eur)}/an</td>
                  <td className="py-2 pr-4">{formatEur(a.threshold_eur)}/an</td>
                  <td className="py-2 pr-4">
                    {a.status === "sent"
                      ? "✓ envoyée"
                      : a.status === "failed"
                        ? "✗ échec"
                        : "ignorée"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {settingsForm && (
        <form
          onSubmit={handleSaveSettings}
          className="card grid gap-4 sm:grid-cols-2"
        >
          <h2 className="text-lg font-semibold tracking-tight sm:col-span-2">Réglages</h2>

          <label className="block">
            <span className="text-sm font-medium">
              Seuil d&apos;alerte (€/an d&apos;économie)
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={settingsForm.threshold}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, threshold: e.target.value })
              }
              className="field"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">
              Rappel de relevé (jours)
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={settingsForm.reminderDays}
              onChange={(e) =>
                setSettingsForm({
                  ...settingsForm,
                  reminderDays: e.target.value,
                })
              }
              className="field"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">
              Coefficient gaz (kWh par m³, voir facture)
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={settingsForm.gasFactor}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, gasFactor: e.target.value })
              }
              className="field"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">
              Email de notification
            </span>
            <input
              type="email"
              placeholder="pour recevoir les alertes"
              value={settingsForm.notifyEmail}
              onChange={(e) =>
                setSettingsForm({
                  ...settingsForm,
                  notifyEmail: e.target.value,
                })
              }
              className="field"
            />
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settingsForm.alertsEnabled}
              onChange={(e) =>
                setSettingsForm({
                  ...settingsForm,
                  alertsEnabled: e.target.checked,
                })
              }
            />
            <span className="text-sm font-medium">Alertes activées</span>
          </label>

          {error && (
            <p className="text-sm text-red-600 sm:col-span-2">{error}</p>
          )}
          {savedNote && (
            <p className="text-sm text-green-700 sm:col-span-2">
              Réglages enregistrés.
            </p>
          )}

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="btn-primary"
            >
              Enregistrer les réglages
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
