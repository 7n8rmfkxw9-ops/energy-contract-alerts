import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";


const ROLES = [
  { v: "producteur", l: "Producteur" },
  { v: "torrefacteur", l: "Torréfacteur" },
  { v: "shop", l: "Coffee shop" },
  { v: "barista", l: "Barista" },
] as const;

const signUpSchema = z.object({
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(8, "8 caractères minimum").max(72),
  fullName: z.string().trim().min(1, "Nom requis").max(120),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  role: z.enum(["producteur", "torrefacteur", "shop", "barista"]),
});

const signInSchema = z.object({
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(1, "Mot de passe requis").max(72),
});

const Auth = () => {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState<typeof ROLES[number]["v"]>("producteur");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && session) navigate("/", { replace: true });
  }, [session, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (mode === "signup") {
        const parsed = signUpSchema.safeParse({ email, password, fullName, company, role });
        if (!parsed.success) {
          toast({ title: "Vérifiez vos informations", description: parsed.error.issues[0].message, variant: "destructive" });
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: parsed.data.fullName,
              company: parsed.data.company || null,
              role: parsed.data.role,
            },
          },
        });
        if (error) throw error;
        toast({ title: "Compte créé", description: "Vérifiez votre email pour confirmer votre inscription." });
      } else {
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success) {
          toast({ title: "Vérifiez vos informations", description: parsed.error.issues[0].message, variant: "destructive" });
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast({ title: "Bienvenue", description: "Connexion réussie." });
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      const msg = err?.message ?? "Une erreur est survenue";
      const friendly = msg.includes("already registered")
        ? "Un compte existe déjà avec cet email."
        : msg.includes("Invalid login")
        ? "Email ou mot de passe incorrect."
        : msg;
      toast({ title: "Action impossible", description: friendly, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="font-display text-2xl tracking-tight text-foreground">
          terra<span className="text-terracotta">.</span>
        </Link>

        <h1 className="mt-10 font-display text-4xl leading-tight text-balance">
          {mode === "signin" ? (
            <>Bon retour <em className="italic text-terracotta">parmi nous</em>.</>
          ) : (
            <>Rejoignez <em className="italic text-terracotta">Terra</em>.</>
          )}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {mode === "signin"
            ? "Accédez à votre espace producteur, torréfacteur, coffee shop ou barista."
            : "Créez votre compte en précisant votre rôle dans la chaîne du café."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {mode === "signup" && (
            <>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((r) => (
                  <button
                    type="button"
                    key={r.v}
                    onClick={() => setRole(r.v)}
                    className={`px-4 py-1.5 text-sm rounded-full border transition-all ${
                      role === r.v
                        ? "bg-terracotta border-terracotta text-accent-foreground"
                        : "border-border hover:border-foreground/40"
                    }`}
                  >
                    {r.l}
                  </button>
                ))}
              </div>
              <input
                type="text"
                required
                maxLength={120}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nom complet"
                className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-terracotta/40"
              />
              <input
                type="text"
                maxLength={120}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Maison, ferme ou enseigne (optionnel)"
                className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-terracotta/40"
              />
            </>
          )}
          <input
            type="email"
            required
            maxLength={255}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-terracotta/40"
          />
          <input
            type="password"
            required
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "Mot de passe (8 caractères min.)" : "Mot de passe"}
            className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-terracotta/40"
          />

          <button
            type="submit"
            disabled={submitting}
            className="group inline-flex w-full items-center justify-center gap-2 px-6 py-3 rounded-full bg-terracotta text-accent-foreground font-medium hover:bg-terracotta/90 transition-all disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {mode === "signin" ? "Se connecter" : "Créer mon compte"}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-sm text-muted-foreground text-center">
          {mode === "signin" ? (
            <>
              Pas encore de compte ?{" "}
              <button onClick={() => setMode("signup")} className="text-terracotta hover:underline">
                Créer un compte
              </button>
            </>
          ) : (
            <>
              Déjà un compte ?{" "}
              <button onClick={() => setMode("signin")} className="text-terracotta hover:underline">
                Se connecter
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  );
};

export default Auth;
