"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogoMark } from "@/components/Logo";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/readings");
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-56px)] max-w-sm items-center p-8">
      <div className="card w-full">
        <div className="flex justify-center">
          <LogoMark size={44} />
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold tracking-tight">
          {mode === "signin" ? "Connexion" : "Créer le compte"}
        </h1>
        <p className="mt-1 text-center text-sm text-slate-600">
          Application mono-utilisateur : crée ton compte une seule fois, puis
          connecte-toi avec.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Mot de passe</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {mode === "signin" ? "Se connecter" : "Créer le compte"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-sm text-slate-600 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600"
        >
          {mode === "signin"
            ? "Pas encore de compte ? En créer un"
            : "Déjà un compte ? Se connecter"}
        </button>
      </div>
    </main>
  );
}
