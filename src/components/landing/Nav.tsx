import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { label: "Producteurs", href: "#producteurs" },
  { label: "Coffee shops", href: "#shops" },
  { label: "Agent IA", href: "#ia" },
  { label: "Manifeste", href: "#manifeste" },
];

export const Nav = () => {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-50">
      <div className="container flex items-center justify-between py-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-2xl tracking-tight text-primary-foreground">
            terra<span className="text-terracotta">.</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>
        {session ? (
          <button
            onClick={handleSignOut}
            className="text-sm font-medium px-5 py-2 rounded-full bg-primary-foreground/10 backdrop-blur text-primary-foreground border border-primary-foreground/20 hover:bg-primary-foreground hover:text-primary transition-all"
          >
            Se déconnecter
          </button>
        ) : (
          <Link
            to="/auth"
            className="text-sm font-medium px-5 py-2 rounded-full bg-primary-foreground/10 backdrop-blur text-primary-foreground border border-primary-foreground/20 hover:bg-primary-foreground hover:text-primary transition-all"
          >
            Connexion
          </Link>
        )}
      </div>
    </header>
  );
};
