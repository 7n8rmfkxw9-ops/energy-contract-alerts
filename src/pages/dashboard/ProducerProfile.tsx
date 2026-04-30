import { useEffect, useState } from "react";
import { Loader2, Save, Upload } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { DashLayout } from "@/components/dashboard/DashLayout";
import { RoleGate } from "@/components/RoleGate";
import { CERTIFICATION_LABELS, type Certification } from "@/lib/lots";

const PRODUCER_NAV = [
  { to: "/dashboard/producer", label: "Ma ferme" },
  { to: "/dashboard/producer/lots", label: "Mes lots" },
  { to: "/dashboard/messages", label: "Messages" },
];

const CERT_OPTIONS: Certification[] = [
  "organic", "fairtrade", "rainforest_alliance", "demeter", "direct_trade", "none",
];

const profileSchema = z.object({
  full_name: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1, "Nom de la ferme requis").max(120),
  country: z.string().trim().min(2).max(80),
  region: z.string().trim().max(80).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  altitude_m: z.coerce.number().int().min(0).max(5000).optional().nullable(),
  description: z.string().trim().max(1500).optional().or(z.literal("")),
  website_url: z.string().trim().url().max(255).optional().or(z.literal("")),
});

const Inner = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    company: "",
    country: "",
    region: "",
    city: "",
    altitude_m: "" as string | number,
    description: "",
    website_url: "",
    photo_url: "",
    certifications: [] as Certification[],
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            full_name: data.full_name ?? "",
            company: data.company ?? "",
            country: data.country ?? "",
            region: data.region ?? "",
            city: data.city ?? "",
            altitude_m: data.altitude_m ?? "",
            description: data.description ?? "",
            website_url: data.website_url ?? "",
            photo_url: data.photo_url ?? "",
            certifications: (data.certifications ?? []) as Certification[],
          });
        }
        setLoading(false);
      });
  }, [user]);

  const toggleCert = (c: Certification) => {
    setForm((f) => ({
      ...f,
      certifications: f.certifications.includes(c)
        ? f.certifications.filter((x) => x !== c)
        : [...f.certifications, c],
    }));
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Fichier trop lourd", description: "5 Mo maximum.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/farm-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("farm-photos").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload impossible", description: error.message, variant: "destructive" });
    } else {
      const { data } = supabase.storage.from("farm-photos").getPublicUrl(path);
      setForm((f) => ({ ...f, photo_url: data.publicUrl }));
    }
    setUploading(false);
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const altitude =
      form.altitude_m === "" || form.altitude_m === null ? null : Number(form.altitude_m);
    const parsed = profileSchema.safeParse({ ...form, altitude_m: altitude });
    if (!parsed.success) {
      toast({ title: "Vérifiez vos informations", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: parsed.data.full_name,
        company: parsed.data.company,
        country: parsed.data.country,
        region: parsed.data.region || null,
        city: parsed.data.city || null,
        altitude_m: altitude,
        description: parsed.data.description || null,
        website_url: parsed.data.website_url || null,
        photo_url: form.photo_url || null,
        certifications: form.certifications,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Sauvegarde impossible", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profil mis à jour" });
    }
  };

  if (loading) {
    return (
      <DashLayout title="Ma ferme" nav={PRODUCER_NAV}>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </DashLayout>
    );
  }

  return (
    <DashLayout
      title="Ma ferme"
      subtitle="Présentez votre exploitation aux coffee shops et torréfacteurs européens."
      nav={PRODUCER_NAV}
    >
      <form onSubmit={onSave} className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          <div className="aspect-[4/5] rounded-md border border-border overflow-hidden bg-muted">
            {form.photo_url ? (
              <img src={form.photo_url} alt="Ferme" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">
                Aucune photo
              </div>
            )}
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm px-4 py-2 rounded-full border border-border hover:border-foreground/40">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Photo de la ferme
            <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" disabled={uploading} />
          </label>
        </div>

        <div className="md:col-span-2 space-y-4">
          <Field label="Votre nom" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
          <Field label="Nom de la ferme / coopérative" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pays" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
            <Field label="Région" value={form.region} onChange={(v) => setForm({ ...form, region: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ville la plus proche" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
            <Field
              label="Altitude (m)"
              value={String(form.altitude_m ?? "")}
              onChange={(v) => setForm({ ...form, altitude_m: v })}
              type="number"
            />
          </div>
          <Field label="Site web" value={form.website_url} onChange={(v) => setForm({ ...form, website_url: v })} placeholder="https://" />
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={5}
              maxLength={1500}
              placeholder="Histoire de la ferme, terroir, méthodes, vision."
              className="mt-1 w-full px-4 py-3 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-terracotta/40"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Certifications</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CERT_OPTIONS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => toggleCert(c)}
                  className={`px-3 py-1 text-xs rounded-full border transition-all ${
                    form.certifications.includes(c)
                      ? "bg-olive-deep border-olive-deep text-secondary-foreground"
                      : "border-border hover:border-foreground/40"
                  }`}
                >
                  {CERTIFICATION_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background font-medium disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
      </form>
    </DashLayout>
  );
};

const Field = ({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) => (
  <div>
    <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-1 w-full px-4 py-3 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-terracotta/40"
    />
  </div>
);

const ProducerProfile = () => (
  <RoleGate allow={["producteur"]}>
    <Inner />
  </RoleGate>
);
export default ProducerProfile;
