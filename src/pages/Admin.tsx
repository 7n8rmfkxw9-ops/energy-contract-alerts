import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Loader2, LogOut, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { toast } from "@/hooks/use-toast";

type AdminProfile = {
  id: string;
  full_name: string | null;
  company: string | null;
  legal_name: string | null;
  country: string | null;
  vat_number: string | null;
  vat_verified: boolean;
  website_url: string | null;
  verification_status: "pending" | "in_review" | "verified" | "rejected";
  trust_level: "none" | "bronze" | "silver" | "gold";
  admin_notes: string | null;
  created_at: string;
};

const STATUSES = ["pending", "in_review", "verified", "rejected"] as const;
const TRUSTS = ["none", "bronze", "silver", "gold"] as const;

const Admin = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [filter, setFilter] = useState<"all" | typeof STATUSES[number]>("pending");
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    let q = supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("verification_status", filter);
    const { data, error } = await q;
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setProfiles((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, filter]);

  if (authLoading || rolesLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </main>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <ShieldAlert className="w-10 h-10 mx-auto text-destructive" />
          <h1 className="mt-4 font-display text-2xl">Accès réservé</h1>
          <p className="mt-2 text-muted-foreground">Cette page est réservée aux administrateurs Terra.</p>
          <Link to="/" className="mt-6 inline-block text-terracotta hover:underline">Retour à l'accueil</Link>
        </div>
      </main>
    );
  }

  const updateProfile = async (
    p: AdminProfile,
    patch: Partial<Pick<AdminProfile, "verification_status" | "trust_level" | "admin_notes">>,
  ) => {
    const fullPatch = {
      ...patch,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("profiles").update(fullPatch).eq("id", p.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    if (patch.verification_status && patch.verification_status !== p.verification_status) {
      await supabase.from("verification_audit_log").insert({
        user_id: p.id,
        admin_id: user.id,
        action: "status_change",
        previous_status: p.verification_status,
        new_status: patch.verification_status,
        notes: patch.admin_notes ?? null,
      });
    }
    toast({ title: "Mis à jour", description: "Modifications enregistrées." });
    refresh();
  };

  return (
    <main className="min-h-screen bg-background py-12 px-6">
      <div className="container max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
          <button
            onClick={async () => { await signOut(); navigate("/"); }}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-3.5 h-3.5" /> Déconnexion
          </button>
        </div>
        <h1 className="font-display text-4xl">Espace <em className="italic text-terracotta">admin</em></h1>
        <p className="text-muted-foreground mt-2">Validez ou refusez les comptes des membres.</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {(["all", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 text-sm rounded-full border transition-all ${
                filter === s ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground/40"
              }`}
            >
              {s === "all" ? "Tous" : s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : profiles.length === 0 ? (
          <p className="mt-12 text-center text-muted-foreground">Aucun compte dans cette catégorie.</p>
        ) : (
          <ul className="mt-8 space-y-4">
            {profiles.map((p) => (
              <li key={p.id} className="p-5 rounded-xl border border-border space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium">
                      {p.full_name ?? "(sans nom)"} {p.vat_verified && <BadgeCheck className="inline w-4 h-4 text-terracotta" />}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {p.company ?? "—"} · {p.country ?? "—"} · TVA: {p.vat_number ?? "—"}
                    </p>
                    {p.website_url && (
                      <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-terracotta hover:underline">
                        {p.website_url}
                      </a>
                    )}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-muted">{p.verification_status}</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  <select
                    value={p.verification_status}
                    onChange={(e) => updateProfile(p, { verification_status: e.target.value as any })}
                    className="text-sm px-3 py-1.5 rounded border border-border bg-background"
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select
                    value={p.trust_level}
                    onChange={(e) => updateProfile(p, { trust_level: e.target.value as any })}
                    className="text-sm px-3 py-1.5 rounded border border-border bg-background"
                  >
                    {TRUSTS.map((t) => <option key={t} value={t}>Badge: {t}</option>)}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
};

export default Admin;
