import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";

const emailSchema = z.string().trim().email("Email invalide").max(255);

export const Waitlist = () => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("producteur");
  const [done, setDone] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast({ title: "Email invalide", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setDone(true);
    toast({ title: "Bienvenue dans Terra", description: "On vous écrit dès l'ouverture des accès." });
  };

  return (
    <section id="waitlist" className="relative bg-olive-deep text-primary-foreground py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 grain opacity-40" />
      <div className="container relative">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-xs tracking-[0.3em] uppercase text-terracotta">Accès anticipé</span>
          <h2 className="mt-4 font-display text-4xl md:text-6xl leading-[1.05] text-balance">
            Soyez parmi les <em className="italic text-terracotta">premières maisons</em> à rejoindre Terra.
          </h2>
          <p className="mt-6 text-lg text-primary-foreground/70 font-light max-w-xl mx-auto">
            Lancement Q3 2026 à Berlin, Paris, Milan, Lisbonne et Copenhague. Inscription prioritaire pour les producteurs et coffee shops engagés.
          </p>

          {done ? (
            <div className="mt-12 inline-flex items-center gap-3 px-6 py-4 rounded-full bg-primary-foreground/10 border border-primary-foreground/20">
              <Check className="w-5 h-5 text-terracotta" />
              <span>Vous êtes sur la liste. À très vite.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-12 max-w-xl mx-auto">
              <div className="flex flex-wrap gap-2 justify-center mb-5">
                {[
                  { v: "producteur", l: "Producteur" },
                  { v: "torrefacteur", l: "Torréfacteur" },
                  { v: "shop", l: "Coffee shop" },
                  { v: "barista", l: "Barista" },
                ].map((r) => (
                  <button
                    type="button"
                    key={r.v}
                    onClick={() => setRole(r.v)}
                    className={`px-4 py-1.5 text-sm rounded-full border transition-all ${
                      role === r.v
                        ? "bg-terracotta border-terracotta text-accent-foreground"
                        : "border-primary-foreground/30 hover:border-primary-foreground/60"
                    }`}
                  >
                    {r.l}
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 p-2 bg-primary-foreground/10 rounded-full border border-primary-foreground/20 backdrop-blur">
                <input
                  type="email"
                  required
                  maxLength={255}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="flex-1 bg-transparent px-5 py-3 text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none"
                />
                <button
                  type="submit"
                  className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-terracotta text-accent-foreground font-medium hover:bg-terracotta/90 transition-all"
                >
                  Réserver ma place
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
