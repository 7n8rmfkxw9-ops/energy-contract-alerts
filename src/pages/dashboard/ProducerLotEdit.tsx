import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Save, Trash2, Upload } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { DashLayout } from "@/components/dashboard/DashLayout";
import { RoleGate } from "@/components/RoleGate";
import { PROCESS_LABELS, STATUS_LABELS, type LotStatus, type ProcessMethod } from "@/lib/lots";

const PRODUCER_NAV = [
  { to: "/dashboard/producer", label: "Ma ferme" },
  { to: "/dashboard/producer/lots", label: "Mes lots" },
  { to: "/dashboard/messages", label: "Messages" },
];

const lotSchema = z.object({
  name: z.string().trim().min(1).max(120),
  variety: z.string().trim().max(120).optional().or(z.literal("")),
  process: z.enum(["washed","natural","honey","anaerobic","wet_hulled","carbonic_maceration","other"]).optional().nullable(),
  humidity_pct: z.coerce.number().min(0).max(100).optional().nullable(),
  acidity: z.coerce.number().min(0).max(10).optional().nullable(),
  body: z.coerce.number().min(0).max(10).optional().nullable(),
  sweetness: z.coerce.number().min(0).max(10).optional().nullable(),
  sca_score: z.coerce.number().min(0).max(100).optional().nullable(),
  volume_kg: z.coerce.number().min(0),
  price_per_kg: z.coerce.number().min(0),
  currency: z.string().length(3),
  status: z.enum(["draft","available","reserved","sold_out"]),
  harvest_year: z.coerce.number().int().min(2000).max(2100).optional().nullable(),
  producer_notes: z.string().trim().max(1500).optional().or(z.literal("")),
});

const PROCESSES: ProcessMethod[] = ["washed","natural","honey","anaerobic","wet_hulled","carbonic_maceration","other"];
const STATUSES: LotStatus[] = ["draft","available","reserved","sold_out"];

const empty = {
  name: "", variety: "", process: "" as ProcessMethod | "",
  humidity_pct: "" as string | number, acidity: "" as string | number, body: "" as string | number,
  sweetness: "" as string | number, sca_score: "" as string | number,
  volume_kg: "" as string | number, price_per_kg: "" as string | number, currency: "EUR",
  status: "draft" as LotStatus, harvest_year: "" as string | number,
  producer_notes: "", flavor_notes: [] as string[], photo_url: "",
};

const Inner = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new" || !id;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(empty);
  const [flavorInput, setFlavorInput] = useState("");

  useEffect(() => {
    if (isNew || !user) return;
    supabase.from("coffee_lots").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (data) {
        setForm({
          name: data.name, variety: data.variety ?? "",
          process: (data.process as ProcessMethod) ?? "",
          humidity_pct: data.humidity_pct ?? "", acidity: data.acidity ?? "",
          body: data.body ?? "", sweetness: data.sweetness ?? "", sca_score: data.sca_score ?? "",
          volume_kg: data.volume_kg, price_per_kg: data.price_per_kg, currency: data.currency,
          status: data.status, harvest_year: data.harvest_year ?? "",
          producer_notes: data.producer_notes ?? "",
          flavor_notes: data.flavor_notes ?? [],
          photo_url: data.photo_url ?? "",
        });
      }
      setLoading(false);
    });
  }, [id, isNew, user]);

  const addFlavor = () => {
    const v = flavorInput.trim();
    if (!v || form.flavor_notes.includes(v) || form.flavor_notes.length >= 12) return;
    setForm({ ...form, flavor_notes: [...form.flavor_notes, v] });
    setFlavorInput("");
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Fichier trop lourd", variant: "destructive" }); return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/lot-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("lot-photos").upload(path, file);
    if (error) toast({ title: "Upload impossible", description: error.message, variant: "destructive" });
    else {
      const { data } = supabase.storage.from("lot-photos").getPublicUrl(path);
      setForm((f) => ({ ...f, photo_url: data.publicUrl }));
    }
    setUploading(false);
  };

  const toNumOrNull = (v: any) => (v === "" || v === null || v === undefined ? null : Number(v));

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const candidate = {
      name: form.name, variety: form.variety,
      process: form.process || null,
      humidity_pct: toNumOrNull(form.humidity_pct),
      acidity: toNumOrNull(form.acidity), body: toNumOrNull(form.body),
      sweetness: toNumOrNull(form.sweetness), sca_score: toNumOrNull(form.sca_score),
      volume_kg: form.volume_kg, price_per_kg: form.price_per_kg, currency: form.currency,
      status: form.status, harvest_year: toNumOrNull(form.harvest_year),
      producer_notes: form.producer_notes,
    };
    const parsed = lotSchema.safeParse(candidate);
    if (!parsed.success) {
      toast({ title: "Vérifiez vos informations", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      ...parsed.data,
      flavor_notes: form.flavor_notes,
      photo_url: form.photo_url || null,
      producer_id: user.id,
      variety: parsed.data.variety || null,
      producer_notes: parsed.data.producer_notes || null,
    };
    const res = isNew
      ? await supabase.from("coffee_lots").insert(payload).select("id").maybeSingle()
      : await supabase.from("coffee_lots").update(payload).eq("id", id!).select("id").maybeSingle();
    setSaving(false);
    if (res.error) {
      toast({ title: "Sauvegarde impossible", description: res.error.message, variant: "destructive" });
    } else {
      toast({ title: isNew ? "Lot publié" : "Lot mis à jour" });
      navigate("/dashboard/producer/lots");
    }
  };

  const onDelete = async () => {
    if (isNew || !id) return;
    if (!confirm("Supprimer ce lot ? Cette action est définitive.")) return;
    const { error } = await supabase.from("coffee_lots").delete().eq("id", id);
    if (error) toast({ title: "Suppression impossible", description: error.message, variant: "destructive" });
    else { toast({ title: "Lot supprimé" }); navigate("/dashboard/producer/lots"); }
  };

  if (loading) {
    return <DashLayout title="Lot" nav={PRODUCER_NAV}><Loader2 className="w-5 h-5 animate-spin" /></DashLayout>;
  }

  return (
    <DashLayout title={isNew ? "Nouveau lot" : "Modifier le lot"} nav={PRODUCER_NAV}>
      <form onSubmit={onSave} className="grid lg:grid-cols-3 gap-8 max-w-5xl">
        <div className="lg:col-span-1 space-y-3">
          <div className="aspect-video rounded-md border border-border overflow-hidden bg-muted">
            {form.photo_url ? <img src={form.photo_url} className="w-full h-full object-cover" alt="" />
              : <div className="grid place-items-center h-full text-xs text-muted-foreground">Aucune photo</div>}
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm px-4 py-2 rounded-full border border-border">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Photo du lot
            <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
          </label>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Field label="Nom du lot" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Variété (Bourbon, Geisha…)" value={form.variety} onChange={(v) => setForm({ ...form, variety: v })} />
            <Select label="Méthode" value={form.process} onChange={(v) => setForm({ ...form, process: v as any })}
              options={[{ v: "", l: "—" }, ...PROCESSES.map((p) => ({ v: p, l: PROCESS_LABELS[p] }))]} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Humidité %" value={String(form.humidity_pct ?? "")} onChange={(v) => setForm({ ...form, humidity_pct: v })} type="number" />
            <Field label="Acidité /10" value={String(form.acidity ?? "")} onChange={(v) => setForm({ ...form, acidity: v })} type="number" step="0.1" />
            <Field label="Corps /10" value={String(form.body ?? "")} onChange={(v) => setForm({ ...form, body: v })} type="number" step="0.1" />
            <Field label="Douceur /10" value={String(form.sweetness ?? "")} onChange={(v) => setForm({ ...form, sweetness: v })} type="number" step="0.1" />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Notes aromatiques</label>
            <div className="mt-1 flex gap-2">
              <input
                value={flavorInput}
                onChange={(e) => setFlavorInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFlavor(); }}}
                placeholder="Cassis, chocolat noir, jasmin…"
                className="flex-1 px-4 py-2 rounded-md border border-border bg-background"
              />
              <button type="button" onClick={addFlavor} className="px-4 py-2 rounded-full border border-border text-sm">Ajouter</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {form.flavor_notes.map((n) => (
                <button type="button" key={n}
                  onClick={() => setForm({ ...form, flavor_notes: form.flavor_notes.filter((x) => x !== n) })}
                  className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-destructive/10">
                  {n} ✕
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Volume (kg)" value={String(form.volume_kg ?? "")} onChange={(v) => setForm({ ...form, volume_kg: v })} type="number" step="0.1" />
            <Field label="Prix / kg" value={String(form.price_per_kg ?? "")} onChange={(v) => setForm({ ...form, price_per_kg: v })} type="number" step="0.01" />
            <Field label="Devise" value={form.currency} onChange={(v) => setForm({ ...form, currency: v.toUpperCase().slice(0,3) })} />
            <Field label="Score SCA /100" value={String(form.sca_score ?? "")} onChange={(v) => setForm({ ...form, sca_score: v })} type="number" step="0.1" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Année de récolte" value={String(form.harvest_year ?? "")} onChange={(v) => setForm({ ...form, harvest_year: v })} type="number" />
            <Select label="Statut" value={form.status} onChange={(v) => setForm({ ...form, status: v as LotStatus })}
              options={STATUSES.map((s) => ({ v: s, l: STATUS_LABELS[s] }))} />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Notes du producteur</label>
            <textarea
              value={form.producer_notes} onChange={(e) => setForm({ ...form, producer_notes: e.target.value })}
              rows={4} maxLength={1500}
              className="mt-1 w-full px-4 py-3 rounded-md border border-border bg-background"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background font-medium disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isNew ? "Publier" : "Enregistrer"}
            </button>
            {!isNew && (
              <button type="button" onClick={onDelete} className="inline-flex items-center gap-1.5 text-xs text-destructive">
                <Trash2 className="w-3.5 h-3.5" /> Supprimer le lot
              </button>
            )}
          </div>
        </div>
      </form>
    </DashLayout>
  );
};

const Field = ({ label, value, onChange, type = "text", step }: any) => (
  <div>
    <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
    <input type={type} step={step} value={value} onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full px-4 py-2.5 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-terracotta/40" />
  </div>
);
const Select = ({ label, value, onChange, options }: any) => (
  <div>
    <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full px-4 py-2.5 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-terracotta/40">
      {options.map((o: any) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);

const ProducerLotEdit = () => (
  <RoleGate allow={["producteur"]}>
    <Inner />
  </RoleGate>
);
export default ProducerLotEdit;
