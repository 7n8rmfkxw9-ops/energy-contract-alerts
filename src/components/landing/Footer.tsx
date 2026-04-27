export const Footer = () => {
  return (
    <footer className="bg-espresso text-primary-foreground/70 py-16">
      <div className="container">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="font-display text-3xl text-primary-foreground">
              terra<span className="text-terracotta">.</span>
            </div>
            <p className="mt-4 max-w-md text-sm leading-relaxed">
              La place de marché européenne du café de spécialité, augmentée par une IA qui parle le langage du grain.
            </p>
          </div>
          <div>
            <div className="text-xs tracking-[0.2em] uppercase text-primary-foreground mb-4">Plateforme</div>
            <ul className="space-y-2 text-sm">
              <li><a href="#producteurs" className="hover:text-terracotta transition-colors">Producteurs</a></li>
              <li><a href="#shops" className="hover:text-terracotta transition-colors">Coffee shops</a></li>
              <li><a href="#ia" className="hover:text-terracotta transition-colors">Agent IA</a></li>
            </ul>
          </div>
          <div>
            <div className="text-xs tracking-[0.2em] uppercase text-primary-foreground mb-4">Maison</div>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-terracotta transition-colors">Manifeste</a></li>
              <li><a href="#" className="hover:text-terracotta transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-terracotta transition-colors">Presse</a></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-primary-foreground/10 flex flex-wrap justify-between gap-4 text-xs">
          <span>© 2026 Terra · Made with care in Europe</span>
          <span className="tracking-[0.2em] uppercase">From cherry to cup</span>
        </div>
      </div>
    </footer>
  );
};
