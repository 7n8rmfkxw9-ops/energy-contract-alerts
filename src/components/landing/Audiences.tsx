import beans from "@/assets/green-beans.jpg";
import barista from "@/assets/barista-cup.jpg";

const audiences = [
  {
    id: "producteurs",
    eyebrow: "Pour les producteurs",
    title: "Vos lots, racontés avec justesse.",
    body: "Présentez votre ferme, vos parcelles, vos méthodes de traitement. L'IA traduit vos fiches en plusieurs langues, met en valeur vos profils gustatifs et vous connecte aux torréfacteurs et baristas qui cherchent exactement votre style.",
    bullets: ["Fiches générées par l'IA", "Traduction multilingue automatique", "Mises en relation qualifiées"],
    image: beans,
    align: "left" as const,
  },
  {
    id: "shops",
    eyebrow: "Pour les coffee shops & baristas",
    title: "Trouvez le café qui ressemble à votre maison.",
    body: "Décrivez votre identité, vos clients, votre extraction. L'agent explore le réseau européen et propose les producteurs alignés — du micro-lot d'exception au volume régulier pour votre carte signature.",
    bullets: ["Recherche conversationnelle", "Filtres par profil gustatif", "Échange direct, sans intermédiaire"],
    image: barista,
    align: "right" as const,
  },
];

export const Audiences = () => {
  return (
    <section className="bg-background py-24 md:py-40">
      <div className="container">
        <div className="max-w-2xl mb-20">
          <span className="text-xs tracking-[0.3em] uppercase text-terracotta">Deux mondes, un comptoir</span>
          <h2 className="mt-4 font-display text-4xl md:text-6xl text-foreground leading-[1.05] text-balance">
            Une conversation directe entre celles et ceux qui cultivent et celles et ceux qui servent.
          </h2>
        </div>

        <div className="space-y-32">
          {audiences.map((a) => (
            <article
              key={a.id}
              id={a.id}
              className={`grid md:grid-cols-12 gap-8 md:gap-16 items-center ${
                a.align === "right" ? "md:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div className="md:col-span-6">
                <div className="relative overflow-hidden rounded-sm shadow-editorial">
                  <img
                    src={a.image}
                    alt=""
                    width={1024}
                    height={1024}
                    loading="lazy"
                    className="w-full aspect-[4/5] object-cover transition-transform duration-700 hover:scale-105"
                  />
                </div>
              </div>
              <div className="md:col-span-6">
                <span className="text-xs tracking-[0.3em] uppercase text-olive">{a.eyebrow}</span>
                <h3 className="mt-4 font-display text-3xl md:text-5xl text-foreground leading-[1.05] text-balance">
                  {a.title}
                </h3>
                <p className="mt-6 text-lg text-muted-foreground leading-relaxed font-light">{a.body}</p>
                <ul className="mt-8 space-y-3">
                  {a.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-foreground">
                      <span className="mt-2.5 h-px w-6 bg-terracotta shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
