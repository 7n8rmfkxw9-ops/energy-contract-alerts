import heroImage from "@/assets/hero-farmer.jpg";
import { ArrowRight } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-end overflow-hidden bg-espresso">
      <img
        src={heroImage}
        alt="Mains de producteur tenant des cerises de café fraîchement cueillies"
        width={1536}
        height={1024}
        className="absolute inset-0 w-full h-full object-cover opacity-90"
      />
      <div className="absolute inset-0 bg-gradient-fade" />
      <div className="absolute inset-0 grain" />

      {/* Editorial label */}
      <div className="absolute top-32 left-0 right-0 container">
        <div className="flex items-center gap-3 text-primary-foreground/80 animate-fade-in">
          <span className="h-px w-12 bg-primary-foreground/40" />
          <span className="text-xs tracking-[0.3em] uppercase">N°01 — Europe · 2026</span>
        </div>
      </div>

      <div className="relative container pb-24 md:pb-32 z-10">
        <div className="max-w-4xl">
          <h1 className="font-display text-primary-foreground text-5xl md:text-7xl lg:text-8xl font-light leading-[0.95] text-balance animate-fade-up">
            Du cerisier <em className="italic font-normal text-terracotta">fraîchement cueilli</em> à la tasse parfaitement tirée.
          </h1>
          <p className="mt-8 max-w-xl text-lg md:text-xl text-primary-foreground/80 leading-relaxed font-light animate-fade-up [animation-delay:200ms]">
            Terra met directement en lien les producteurs de café et les coffee shops d'Europe — guidé par une IA qui connaît chaque profil gustatif, chaque terroir, chaque comptoir.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4 animate-fade-up [animation-delay:400ms]">
            <a
              href="#waitlist"
              className="group inline-flex items-center gap-2 px-7 py-4 bg-terracotta text-accent-foreground rounded-full font-medium hover:bg-terracotta/90 transition-all shadow-glow"
            >
              Rejoindre la plateforme
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#ia"
              className="inline-flex items-center gap-2 px-7 py-4 text-primary-foreground border border-primary-foreground/30 rounded-full font-medium hover:bg-primary-foreground/10 transition-all"
            >
              Découvrir l'agent IA
            </a>
          </div>

          <div className="mt-16 flex flex-wrap gap-x-12 gap-y-4 text-primary-foreground/70 text-sm animate-fade-up [animation-delay:600ms]">
            <Stat value="280+" label="Producteurs partenaires" />
            <Stat value="14" label="Pays européens" />
            <Stat value="∞" label="Conversations IA" />
          </div>
        </div>
      </div>
    </section>
  );
};

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div>
    <div className="font-display text-3xl text-primary-foreground">{value}</div>
    <div className="text-xs tracking-wider uppercase mt-1">{label}</div>
  </div>
);
