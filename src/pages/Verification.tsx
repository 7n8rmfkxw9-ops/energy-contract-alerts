import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Clock, Loader2, ShieldAlert, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { toast } from "@/hooks/use-toast";
import { EU_VAT_COUNTRIES } from "@/lib/verification";

type Profile = {
  id: string;
  full_name: string | null;
  company: string | null;
  legal_name: string | null;
  vat_number: string | null;
  vat_country_code: string | null;
  vat_verified: boolean;
  verification_status: "pending" | "in_review" | "verified" | "rejected";
  trust_level: "none" | "bronze" | "silver" | "gold";
  website_url: string | null;
};

type Doc = {
  id: string;
  doc_type: string;
  original_filename: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  storage_path: string;
};

const DOC_TYPES = [
  { v: "business_registration", l: "Extrait Kbis / Registre" },
  { v: "organic_certification", l: "Certification bio" },
  { v: "fairtrade_certification", l: "Certification équitable" },
  { v: "farm_photo", l: "Photo de la ferme" },
  { v: "shop_photo", l: "Photo du coffee shop" },
  { v: "id_document", l: "Pièce d'identité" },
  { v: "other", l: "Autre" },
];

const STATUS_LABEL: Record<string, { label: string; classes: string; icon: typeof BadgeCheck }> = {
  pending: { label: "En attente de revue", classes: "bg-muted text-foreground", icon: Clock },
  in_review: { label: "En cours de revue", classes: "bg-olive/20 text-olive-deep", icon: Clock },
  verified: { label: "Vérifié", classes: "bg-terracotta/20 text-terracotta", icon: BadgeCheck },
  rejected: { label: "Refusé", classes: "bg-destructive/15 text-destructive", icon: ShieldAlert },
};

const Verification = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isPro, loading: rolesLoading } = useUserRoles();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [vatCountry, setVatCountry] = useState("FR");
  const [vatNumber, setVatNumber] = useState("");
  const [website, setWebsite] = useState("");
  const [docType, setDocType] = useState(DOC_TYPES[0].v);
  const [vatLoading, setVatLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const refresh = async () => {
    if (!user) return;
    const [{ data: p }, { data: d }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("verification_documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    if (p) {
      setProfile(p as any);
      setVatCountry(p.vat_country_code || "FR");
      setVatNumber(p.vat_number?.replace(p.vat_country_code || "", "") || "");
      setWebsite(p.website_url || "");
    }
    if (d) setDocs(d as any);
  };

  useEffect(() => {
    if (user) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSaveBasics = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ website_url: website.trim() || null })
      .eq("id", user.id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: "Enregistré", description: "Site web mis à jour." });
    refresh();
  };

  const handleVerifyVat = async () => {
    if (!vatNumber.trim()) {
      toast({ title: "Numéro requis", description: "Renseignez votre numéro de TVA.", variant: "destructive" });
      return;
    }
    setVatLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-vat", {
        body: { vat_number: vatNumber.trim(), country_code: vatCountry },
      });
      if (error) throw error;
      if (data?.valid) {
        toast({
          title: "TVA vérifiée ✓",
          description: data.legal_name ? `Raison sociale : ${data.legal_name}` : "Numéro valide selon VIES.",
        });
      } else {
        toast({ title: "TVA non valide", description: "VIES ne reconnaît pas ce numéro.", variant: "destructive" });
      }
      refresh();
    } catch (err: any) {
      toast({ title: "Vérification impossible", description: err?.message ?? "Réessayez plus tard.", variant: "destructive" });
    } finally {
      setVatLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Fichier trop lourd", description: "10 Mo maximum.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${docType}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("verification-docs")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("verification_documents").insert({
        user_id: user.id,
        doc_type: docType as any,
        storage_path: path,
        original_filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        status: "pending",
      });
      if (insErr) throw insErr;
      toast({ title: "Document envoyé", description: "Notre équipe va le vérifier." });
      refresh();
    } catch (err: any) {
      toast({ title: "Envoi impossible", description: err?.message ?? "Réessayez plus tard.", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteDoc = async (doc: Doc) => {
    if (!user) return;
    await supabase.storage.from("verification-docs").remove([doc.storage_path]);
    await supabase.from("verification_documents").delete().eq("id", doc.id);
    refresh();
  };

  if (authLoading || rolesLoading || !profile) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  const status = STATUS_LABEL[profile.verification_status];
  const StatusIcon = status.icon;

  return (
    <main className="min-h-screen bg-background py-12 px-6">
      <div className="container max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>

        <h1 className="font-display text-4xl md:text-5xl leading-tight">
          Faites <em className="italic text-terracotta">vérifier</em> votre compte
        </h1>
        <p className="mt-3 text-muted-foreground max-w-xl">
          Pour gagner la confiance des autres acteurs de la chaîne, prouvez votre identité professionnelle.
          Plus vous fournissez d'éléments, plus votre badge de confiance monte.
        </p>

        <div className={`mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full ${status.classes}`}>
          <StatusIcon className="w-4 h-4" />
          <span className="text-sm font-medium">{status.label}</span>
          {profile.trust_level !== "none" && (
            <span className="ml-2 text-xs uppercase tracking-wider">Badge {profile.trust_level}</span>
          )}
        </div>

        {/* TVA */}
        {isPro && (
          <section className="mt-12">
            <h2 className="font-display text-2xl">Numéro de TVA intracommunautaire</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Vérification automatique via le service officiel VIES (Commission européenne).
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <select
                value={vatCountry}
                onChange={(e) => setVatCountry(e.target.value)}
                className="px-3 py-3 rounded-lg border border-border bg-background"
              >
                {EU_VAT_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                placeholder="12345678901"
                maxLength={20}
                className="flex-1 px-4 py-3 rounded-lg border border-border bg-background"
              />
              <button
                onClick={handleVerifyVat}
                disabled={vatLoading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-terracotta text-accent-foreground font-medium hover:bg-terracotta/90 disabled:opacity-60"
              >
                {vatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Vérifier"}
              </button>
            </div>
            {profile.vat_verified && (
              <p className="mt-3 text-sm text-terracotta inline-flex items-center gap-1">
                <BadgeCheck className="w-4 h-4" /> TVA confirmée
                {profile.legal_name && ` — ${profile.legal_name}`}
              </p>
            )}
          </section>
        )}

        {/* Website */}
        <section className="mt-12">
          <h2 className="font-display text-2xl">Site web</h2>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://votre-domaine.com"
              maxLength={255}
              className="flex-1 px-4 py-3 rounded-lg border border-border bg-background"
            />
            <button
              onClick={handleSaveBasics}
              className="px-6 py-3 rounded-lg border border-border hover:bg-muted font-medium"
            >
              Enregistrer
            </button>
          </div>
        </section>

        {/* Documents */}
        <section className="mt-12">
          <h2 className="font-display text-2xl">Documents justificatifs</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Confidentiels. Visibles uniquement par vous et l'équipe Terra. 10 Mo max par fichier.
          </p>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="px-3 py-3 rounded-lg border border-border bg-background"
            >
              {DOC_TYPES.map((d) => (
                <option key={d.v} value={d.v}>{d.l}</option>
              ))}
            </select>
            <label className="flex-1 cursor-pointer">
              <input type="file" onChange={handleUpload} disabled={uploading} className="hidden" />
              <span className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg border border-dashed border-border hover:bg-muted">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Envoi..." : "Choisir un fichier"}
              </span>
            </label>
          </div>

          <ul className="mt-6 space-y-2">
            {docs.length === 0 && (
              <li className="text-sm text-muted-foreground">Aucun document envoyé pour l'instant.</li>
            )}
            {docs.map((d) => {
              const s = STATUS_LABEL[d.status] ?? STATUS_LABEL.pending;
              return (
                <li key={d.id} className="flex items-center justify-between gap-3 p-4 rounded-lg border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{d.original_filename ?? d.doc_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {DOC_TYPES.find((t) => t.v === d.doc_type)?.l} · {new Date(d.created_at).toLocaleDateString()}
                    </p>
                    {d.rejection_reason && (
                      <p className="text-xs text-destructive mt-1">Raison : {d.rejection_reason}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${s.classes}`}>{s.label}</span>
                  <button onClick={() => handleDeleteDoc(d)} className="text-muted-foreground hover:text-destructive">
                    <X className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
};

export default Verification;
