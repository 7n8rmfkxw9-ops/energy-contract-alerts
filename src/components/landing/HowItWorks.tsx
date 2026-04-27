const steps = [
  {
    n: "01",
    title: "Vous créez votre profil",
    body: "Producteur, torréfacteur, coffee shop ou barista — votre identité, vos lots, votre style.",
  },
  {
    n: "02",
    title: "L'agent vous écoute",
    body: "Conversation naturelle pour comprendre ce que vous cherchez (ou ce que vous proposez).",
  },
  {
    n: "03",
    title: "Des matchs qualifiés",
    body: "L'IA propose des correspondances précises avec une explication transparente du pourquoi.",
  },
  {
    n: "04",
    title: "Vous échangez en direct",
    body: "Messagerie intégrée, traduction temps réel. Pas d'intermédiaire, pas de commission cachée.",
  },
];

export const HowItWorks = () => {
  return (
    <section id="manifeste" className="bg-cream py-24 md:py-40">
      <div className="container">
        <div className="max-w-2xl mb-16">
          <span className="text-xs tracking-[0.3em] uppercase text-olive">Comment ça marche</span>
          <h2 className="mt-4 font-display text-4xl md:text-6xl text-foreground leading-[1.05] text-balance">
            Quatre gestes, et la chaîne est rétablie.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-sm overflow-hidden">
          {steps.map((s) => (
            <div key={s.n} className="bg-cream p-8 md:p-10">
              <div className="font-display text-5xl text-terracotta mb-8">{s.n}</div>
              <h3 className="font-display text-2xl mb-3 text-foreground leading-tight">{s.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
