import { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type NavEntry = { to: string; label: string };

export const DashLayout = ({
  title,
  subtitle,
  nav,
  children,
}: {
  title: string;
  subtitle?: string;
  nav: NavEntry[];
  children: ReactNode;
}) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/40 backdrop-blur sticky top-0 z-30">
        <div className="container flex items-center justify-between py-4">
          <Link to="/" className="font-display text-xl tracking-tight">
            terra<span className="text-terracotta">.</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm rounded-full transition-all ${
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-3.5 h-3.5" /> Quitter
          </button>
        </div>
        <nav className="md:hidden container flex gap-1 overflow-x-auto pb-3 -mt-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-1.5 text-xs rounded-full transition-all ${
                  isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground border border-border"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="container py-10">
        <div className="mb-10">
          <h1 className="font-display text-4xl md:text-5xl text-balance">{title}</h1>
          {subtitle && <p className="mt-2 text-muted-foreground max-w-2xl">{subtitle}</p>}
          {user?.email && (
            <p className="mt-1 text-xs text-muted-foreground">Connecté en tant que {user.email}</p>
          )}
        </div>
        {children}
      </main>
    </div>
  );
};
