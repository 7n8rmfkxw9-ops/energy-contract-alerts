"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import {
  computeConsumptionPeriods,
  daysSinceLastReading,
  DEFAULT_GAS_KWH_PER_M3,
} from "@/lib/readings/consumption";
import { parseDecimalInput } from "@/lib/forms/parseDecimal";

type ReadingRow = Database["public"]["Tables"]["meter_readings"]["Row"];
type Supabase = ReturnType<typeof createClient>;

interface FormState {
  readingDate: string;
  elecDay: string;
  elecNight: string;
  gas: string;
  note: string;
}

const emptyForm = (): FormState => ({
  readingDate: new Date().toISOString().slice(0, 10),
  elecDay: "",
  elecNight: "",
  gas: "",
  note: "",
});

export default function ReadingsPage() {
  const [supabase, setSupabase] = useState<Supabase | null>(
    null,
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [readings, setReadings] = useState<ReadingRow[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadReadings = useCallback(
    async (client: Supabase) => {
      const { data, error } = await client
        .from("meter_readings")
        .select("*")
        .order("reading_date", { ascending: false });
      if (error) {
        setError(error.message);
        return;
      }
      setReadings(data ?? []);
    },
    [],
  );

  useEffect(() => {
    const client = createClient();
    setSupabase(client);
    client.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAuthChecked(true);
      if (data.user) void loadReadings(client);
    });
  }, [loadReadings]);

  const periods = useMemo(
    () =>
      computeConsumptionPeriods(
        readings.map((r) => ({
          id: r.id,
          readingDate: r.reading_date,
          elecDayIndex: r.elec_day_index,
          elecNightIndex: r.elec_night_index,
          gasIndexM3: r.gas_index_m3,
        })),
        DEFAULT_GAS_KWH_PER_M3,
      ),
    [readings],
  );

  const daysSince = useMemo(
    () =>
      daysSinceLastReading(
        readings.map((r) => ({
          readingDate: r.reading_date,
          elecDayIndex: r.elec_day_index,
          elecNightIndex: r.elec_night_index,
          gasIndexM3: r.gas_index_m3,
        })),
        new Date().toISOString().slice(0, 10),
      ),
    [readings],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !userId) return;
    setError(null);

    const elecDay = parseDecimalInput(form.elecDay);
    const gas = parseDecimalInput(form.gas);
    if (elecDay === null && gas === null) {
      setError("Renseigne au moins un index (électricité ou gaz).");
      return;
    }

    setBusy(true);
    const payload = {
      user_id: userId,
      reading_date: form.readingDate,
      elec_day_index: elecDay,
      elec_night_index: parseDecimalInput(form.elecNight),
      gas_index_m3: gas,
      note: form.note.trim() || null,
    };

    const { error } = editingId
      ? await supabase
          .from("meter_readings")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", editingId)
      : await supabase.from("meter_readings").insert(payload);

    setBusy(false);
    if (error) {
      setError(
        error.code === "23505"
          ? "Un relevé existe déjà à cette date : édite-le plutôt."
          : error.message,
      );
      return;
    }

    setForm(emptyForm());
    setEditingId(null);
    await loadReadings(supabase);
  }

  function startEdit(row: ReadingRow) {
    setEditingId(row.id);
    setForm({
      readingDate: row.reading_date,
      elecDay: row.elec_day_index?.toString() ?? "",
      elecNight: row.elec_night_index?.toString() ?? "",
      gas: row.gas_index_m3?.toString() ?? "",
      note: row.note ?? "",
    });
  }

  async function handleDelete(id: string) {
    if (!supabase) return;
    if (!window.confirm("Supprimer ce relevé ?")) return;
    const { error } = await supabase
      .from("meter_readings")
      .delete()
      .eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm());
    }
    await loadReadings(supabase);
  }

  if (!authChecked) {
    return <main className="p-8 text-slate-500">Chargement…</main>;
  }

  if (!userId) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <p>
          Tu dois être connecté pour saisir des relevés.{" "}
          <Link href="/auth" className="underline">
            Se connecter
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Relevés de compteur</h1>
        {daysSince !== null && (
          <p className="mt-1 text-sm text-slate-600">
            Dernier relevé : il y a {daysSince} jour{daysSince > 1 ? "s" : ""}.
          </p>
        )}
      </header>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 sm:grid-cols-2"
      >
        <h2 className="text-lg font-medium sm:col-span-2">
          {editingId ? "Corriger le relevé" : "Nouveau relevé"}
        </h2>

        <label className="block">
          <span className="text-sm font-medium">Date du relevé</span>
          <input
            type="date"
            required
            value={form.readingDate}
            onChange={(e) => setForm({ ...form, readingDate: e.target.value })}
            className="mt-1 w-full rounded border border-slate-300 p-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Index gaz (m³)</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="ex : 4321,875"
            value={form.gas}
            onChange={(e) => setForm({ ...form, gas: e.target.value })}
            className="mt-1 w-full rounded border border-slate-300 p-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">
            Index élec jour — ou index unique (kWh)
          </span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="ex : 45210,4"
            value={form.elecDay}
            onChange={(e) => setForm({ ...form, elecDay: e.target.value })}
            className="mt-1 w-full rounded border border-slate-300 p-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">
            Index élec nuit (kWh, si bi-horaire)
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={form.elecNight}
            onChange={(e) => setForm({ ...form, elecNight: e.target.value })}
            className="mt-1 w-full rounded border border-slate-300 p-2"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Note (optionnel)</span>
          <input
            type="text"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="mt-1 w-full rounded border border-slate-300 p-2"
          />
        </label>

        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}

        <div className="flex gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {editingId ? "Enregistrer la correction" : "Ajouter le relevé"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm());
              }}
              className="rounded border border-slate-300 px-4 py-2"
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      <section>
        <h2 className="text-lg font-medium">Historique</h2>
        {readings.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Aucun relevé pour l&apos;instant. Ajoute ton premier index
            ci-dessus ; la consommation sera calculée dès le deuxième relevé.
          </p>
        ) : (
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Élec jour (kWh)</th>
                <th className="py-2 pr-4">Élec nuit (kWh)</th>
                <th className="py-2 pr-4">Gaz (m³)</th>
                <th className="py-2 pr-4">Note</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {readings.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">{row.reading_date}</td>
                  <td className="py-2 pr-4">{row.elec_day_index ?? "—"}</td>
                  <td className="py-2 pr-4">{row.elec_night_index ?? "—"}</td>
                  <td className="py-2 pr-4">{row.gas_index_m3 ?? "—"}</td>
                  <td className="py-2 pr-4">{row.note ?? ""}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => startEdit(row)}
                      className="mr-3 text-slate-600 underline"
                    >
                      Éditer
                    </button>
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="text-red-600 underline"
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

      {periods.length > 0 && (
        <section>
          <h2 className="text-lg font-medium">
            Consommation entre relevés
          </h2>
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className="py-2 pr-4">Période</th>
                <th className="py-2 pr-4">Jours</th>
                <th className="py-2 pr-4">Élec jour</th>
                <th className="py-2 pr-4">Élec nuit</th>
                <th className="py-2 pr-4">Gaz</th>
              </tr>
            </thead>
            <tbody>
              {periods
                .slice()
                .reverse()
                .map((p) => (
                  <tr key={`${p.from}-${p.to}`} className="border-b border-slate-100">
                    <td className="py-2 pr-4">
                      {p.from} → {p.to}
                      {p.warnings.length > 0 && (
                        <span
                          className="ml-2 text-amber-600"
                          title={p.warnings.join(" ")}
                        >
                          ⚠
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4">{p.days}</td>
                    <td className="py-2 pr-4">
                      {p.elecDayKwh !== null ? `${p.elecDayKwh} kWh` : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {p.elecNightKwh !== null ? `${p.elecNightKwh} kWh` : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {p.gasM3 !== null
                        ? `${p.gasM3} m³ (≈ ${p.gasKwh} kWh)`
                        : "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
