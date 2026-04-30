import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, Pencil, Coffee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashLayout } from "@/components/dashboard/DashLayout";
import { RoleGate } from "@/components/RoleGate";
import { STATUS_LABELS, formatPrice, type Lot } from "@/lib/lots";

const PRODUCER_NAV = [
  { to: "/dashboard/producer", label: "Ma ferme" },
  { to: "/dashboard/producer/lots", label: "Mes lots" },
  { to: "/dashboard/messages", label: "Messages" },
];

const Inner = () => {
  const { user } = useAuth();
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("coffee_lots")
      .select("*")
      .eq("producer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setLots((data ?? []) as Lot[]);
        setLoading(false);
      });
  }, [user]);

  return (
    <DashLayout
      title="Mes lots"
      subtitle="Publiez vos micro-lots avec leur profil aromatique SCA. Les acheteurs vérifiés peuvent vous contacter directement."
      nav={PRODUCER_NAV}
    >
      <div className="flex justify-end mb-6">
        <Link
          to="/dashboard/producer/lots/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-terracotta text-accent-foreground font-medium hover:bg-terracotta/90"
        >
          <Plus className="w-4 h-4" /> Nouveau lot
        </Link>
      </div>

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      ) : lots.length === 0 ? (
        <div className="border border-dashed border-border rounded-md p-12 text-center">
          <Coffee className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">Aucun lot publié pour le moment.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lots.map((lot) => (
            <article key={lot.id} className="border border-border rounded-md overflow-hidden bg-card">
              {lot.photo_url ? (
                <img src={lot.photo_url} alt={lot.name} className="w-full aspect-video object-cover" />
              ) : (
                <div className="w-full aspect-video bg-muted grid place-items-center">
                  <Coffee className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg leading-tight">{lot.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                    lot.status === "available" ? "bg-olive/20 text-olive-deep"
                    : lot.status === "sold_out" ? "bg-muted text-muted-foreground"
                    : "bg-terracotta/15 text-terracotta"
                  }`}>{STATUS_LABELS[lot.status]}</span>
                </div>
                {lot.variety && <p className="mt-1 text-xs text-muted-foreground">{lot.variety}</p>}
                <div className="mt-3 flex justify-between text-sm">
                  <span>{Number(lot.volume_kg)} kg</span>
                  <span className="font-medium">{formatPrice(Number(lot.price_per_kg), lot.currency)} / kg</span>
                </div>
                <Link
                  to={`/dashboard/producer/lots/${lot.id}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs text-terracotta hover:underline"
                >
                  <Pencil className="w-3 h-3" /> Modifier
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </DashLayout>
  );
};

const ProducerLots = () => (
  <RoleGate allow={["producteur"]}>
    <Inner />
  </RoleGate>
);
export default ProducerLots;
