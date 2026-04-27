import { Sparkles, MessageSquareText, Languages, FileText } from "lucide-react";

const capabilities = [
  {
    icon: Sparkles,
    title: "Matching intelligent",
    desc: "L'agent croise terroirs, profils gustatifs, volumes, valeurs et logistique pour suggérer les meilleurs accords producteur ↔ coffee shop.",
  },
  {
    icon: MessageSquareText,
    title: "Assistant conversationnel",
    desc: "Posez vos questions en langage naturel. « Trouve-moi un Geisha lavé bolivien sous 80€/kg, livrable à Lisbonne. »",
  },
  {
    icon: FileText,
    title: "Génération de fiches",
    desc: "Décrivez votre lot — l'IA rédige une fiche éditoriale précise, avec notes de dégustation, méthode et story-telling.",
  },
  {
    icon: Languages,
    title: "Traduction multilingue",
    desc: "FR, EN, IT, ES, DE, PT. L'agent fluidifie chaque échange pour que rien ne se perde entre la ferme et le bar.",
  },
];

export const AISection = () => {
  return (
    <section id="ia" className="relative py-24 md:py-40 bg-espresso text-primary-foreground overflow-hidden">
      <div className="absolute inset-0 grain opacity-50" />
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-terracotta/20 blur-3xl" />

      <div className="relative container">
        <div className="grid md:grid-cols-12 gap-12 mb-20">
          <div className="md:col-span-5">
            <span className="text-xs tracking-[0.3em] uppercase text-terracotta">L'agent Terra</span>
            <h2 className="mt-4 font-display text-4xl md:text-6xl leading-[1.05] text-balance">
              Une IA qui comprend le café <em className="italic text-terracotta">comme un Q-grader.</em>
            </h2>
          </div>
          <div className="md:col-span-6 md:col-start-7 flex items-end">
            <p className="text-lg text-primary-foreground/70 leading-relaxed font-light">
              Entraîné sur les profils gustatifs SCA, les méthodes de traitement et les milliers de lots qui transitent en Europe chaque mois. Il parle votre langue, comprend votre comptoir et travaille pendant que vous tirez vos shots.
            </p>
          </div>
        </div>

        {/* Chat preview */}
        <div className="mb-24 max-w-3xl mx-auto rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 backdrop-blur-sm p-6 md:p-8 shadow-editorial">
          <div className="flex items-center gap-2 mb-6 text-xs text-primary-foreground/50 tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-terracotta animate-pulse" />
            Agent Terra · en ligne
          </div>
          <div className="space-y-5">
            <Bubble side="user">
              Je tiens un coffee shop à Berlin, je cherche un café fruité, naturel, idéal pour filtre V60. Budget 18€/kg vert.
            </Bubble>
            <Bubble side="ai">
              J'ai trois lots qui correspondent. Le plus aligné : <strong className="text-terracotta">Finca La Esperanza</strong>, Huila — natural, notes de fraise des bois, framboise et cacao. 17,40€/kg, disponible immédiatement à Hambourg. Je vous mets en relation avec Andrés ?
            </Bubble>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {capabilities.map((c) => (
            <div
              key={c.title}
              className="group p-8 rounded-lg border border-primary-foreground/15 hover:border-terracotta/50 transition-all hover:bg-primary-foreground/5"
            >
              <c.icon className="w-6 h-6 text-terracotta mb-6" />
              <h3 className="font-display text-xl mb-3">{c.title}</h3>
              <p className="text-sm text-primary-foreground/70 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Bubble = ({ side, children }: { side: "user" | "ai"; children: React.ReactNode }) => (
  <div className={`flex ${side === "user" ? "justify-end" : "justify-start"}`}>
    <div
      className={`max-w-[85%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed ${
        side === "user"
          ? "bg-primary-foreground/10 text-primary-foreground rounded-br-sm"
          : "bg-terracotta/15 text-primary-foreground rounded-bl-sm border border-terracotta/20"
      }`}
    >
      {children}
    </div>
  </div>
);
