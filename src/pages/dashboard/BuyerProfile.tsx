import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { DashLayout } from "@/components/dashboard/DashLayout";
import { RoleGate } from "@/components/RoleGate";
import { PROCESS_LABELS, type ProcessMethod } from "@/lib/lots";

export const BUYER_NAV = [
  { to: "/dashboard/buyer", label: "Mon espace" },
  { to: "/dashboard/buyer/discover", label: "Découvrir" },
  { to: "/dashboard/buyer/favorites", label: "Favoris" },
  { to: "/dashboard/messages", label: "Messages" },
];

const profileSchema = z.object({
  full_name: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1, "Nom de l'enseigne requis").max(120),
  country: z.string().trim().min(2).max(80),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  description: z.string().trim().max(1500).optional().or(z.literal("")),
  website_url: z.string().trim().url().max(255).optional().or(z.literal("")),
});

type Prefs = {
  origins: string[];
  processes: ProcessMethod[];
  flavor_keywords: string[];
  budget_per_kg_max: number | null;
  monthly_volume_kg: number | null;
};

const PROCESSES: ProcessMethod[] = ["washed","natural","honey","anaerobic","wet_hulled","carbonic_maceration","other"];

const Inner = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "", company: "", country: "", city: "",
    description: "", website_url: "",
  });
  const [prefs, setPrefs] = useState<Prefs>({
    origins: [], processes: [], flavor_keywords: [],
    budget_per_kg_max: null, monthly_volume_kg: null,
  });
  const [originInput, setOriginInput] = useState("");
  const [flavorInput, setFlavorInput] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setForm({
          full_name: data.full_name ?? "", company: data.company ?? "",
          country: data.country ?? "", city: data.city ?? "",
          description: data.description ?? "", website_url: data.website_url ?? "",
        });
        const p = (data.sourcing_preferences ?? {}) as Partial<Prefs>;
        setPrefs({
          origins: p.origins ?? [], processes: p.processes ?? [],
          flavor_keywords: p.flavor_keywords ?? [],
          budget_per_kg_max: p.budget_per_kg_max ?? null,
          monthly_volume_kg: p.monthly_volume_kg ?? null,
        });
      }
      setLoading(false);
    });
  }, [user]);

  const toggleProcess = (p: ProcessMethod) => {
    setPrefs((s) => ({
      ...s,
      processes: s.processes.includes(p) ? s.processes.filter((x) => x !== p) : [...s.processes, p],
    }));
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Vérifiez vos informations", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: parsed.data.full_name, company: parsed.data.company,
      country: parsed.data.country, city: parsed.data.city || null,
      description: parsed.data.description || null,
      website_url: parsed.data.website_url || null,
      sourcing_preferences: prefs as any,
    }).eq("id", user.id);
    setSaving(false);
    if (error) toast({ title: "Sauvegarde impossible", description: error.message, variant: "destructive" });
    else toast({ title: "Profil mis à jour" });
  };

  if (loading) {
    return <DashLayout title="Mon espace" nav={BUYER_NAV}><Loader2 className="w-5 h-5 animate-spin" /></DashLayout>;
  }

  return (
    <DashLayout
      title="Mon espace"
      subtitle="Affinez vos préférences pour que l'agent Terra vous propose les meilleurs lots."
      nav={BUYER_NAV}
    >
      <form onSubmit={onSave} className="grid lg:grid-cols-2 gap-10 max-w-5xl">
        <section className="space-y-4">
          <h2 className="font-display text-2xl">Identité</h2>
          <Field label="Votre nom" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
          <Field label="Enseigne" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pays" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
            <Field label="Ville" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          </div>
          <Field label="Site web" value={form.website_url} onChange={(v) => setForm({ ...form, website_url: v })} placeholder="https://" />
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Description</label>
            <textarea
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4} maxLength={1500}
              className="mt-1 w-full px-4 py-3 rounded-md border border-border bg-background"
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-2xl">Préférences de sourcing</h2>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Origines recherchées</label>
            <div className="mt-1 flex gap-2">
              <input value={originInput} onChange={(e) => setOriginInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault();
                  const v = originInput.trim(); if (v && !prefs.origins.includes(v)) setPrefs({ ...prefs, origins: [...prefs.origins, v] }); setOriginInput("");
                }}}
                placeholder="Éthiopie, Colombie, Burundi…"
                className="flex-1 px-4 py-2 rounded-md border border-border bg-background" />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {prefs.origins.map((o) => (
                <button type="button" key={o}
                  onClick={() => setPrefs({ ...prefs, origins: prefs.origins.filter((x) => x !== o) })}
                  className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-destructive/10">{o} ✕</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Méthodes</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PROCESSES.map((p) => (
                <button type="button" key={p} onClick={() => toggleProcess(p)}
                  className={`px-3 py-1 text-xs rounded-full border ${prefs.processes.includes(p) ? "bg-foreground text-background border-foreground" : "border-border"}`}>
                  {PROCESS_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Profils gustatifs recherchés</label>
            <div className="mt-1 flex gap-2">
              <input value={flavorInput} onChange={(e) => setFlavorInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault();
                  const v = flavorInput.trim(); if (v && !prefs.flavor_keywords.includes(v)) setPrefs({ ...prefs, flavor_keywords: [...prefs.flavor_keywords, v] }); setFlavorInput("");
                }}}
                placeholder="floral, chocolaté, fruits rouges…"
                className="flex-1 px-4 py-2 rounded-md border border-border bg-background" />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {prefs.flavor_keywords.map((o) => (
                <button type="button" key={o}
                  onClick={() => setPrefs({ ...prefs, flavor_keywords: prefs.flavor_keywords.filter((x) => x !== o) })}
                  className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-destructive/10">{o} ✕</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Budget max / kg (€)" type="number"
              value={prefs.budget_per_kg_max?.toString() ?? ""}
              onChange={(v) => setPrefs({ ...prefs, budget_per_kg_max: v ? Number(v) : null })} />
            <Field label="Volume mensuel (kg)" type="number"
              value={prefs.monthly_volume_kg?.toString() ?? ""}
              onChange={(v) => setPrefs({ ...prefs, monthly_volume_kg: v ? Number(v) : null })} />
          </div>
        </section>

        <div className="lg:col-span-2">
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background font-medium disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
      </form>
    </DashLayout>
  );
};

const Field = ({ label, value, onChange, type = "text", placeholder }: any) => (
  <div>
    <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
    <input type={type} value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full px-4 py-2.5 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-terracotta/40" />
  </div>
);

const BuyerProfile = () => (
  <RoleGate allow={["shop", "torrefacteur"]}>
    <Inner />
  </RoleGate>
);
export default BuyerProfile;
