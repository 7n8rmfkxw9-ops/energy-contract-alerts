import { useEffect, useState } from "react";
import { Loader2, Heart, Coffee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashLayout } from "@/components/dashboard/DashLayout";
import { RoleGate } from "@/components/RoleGate";
import { BUYER_NAV } from "./BuyerProfile";
import { formatPrice, type Lot } from "@/lib/lots";

const Inner = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lots, setLots] = useState<Lot[]>([]);
  const [producers, setProducers] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: lotFavs } = await supabase.from("lot_favorites").select("lot_id").eq("user_id", user.id);
      const lotIds = (lotFavs ?? []).map((f) => f.lot_id);
      let lotRows: Lot[] = [];
      if (lotIds.length) {
        const { data } = await supabase.from("coffee_lots").select("*").in("id", lotIds);
        lotRows = (data ?? []) as Lot[];
      }

      const { data: prodFavs } = await supabase.from("producer_favorites").select("producer_id").eq("user_id", user.id);
      const ids = (prodFavs ?? []).map((p) => p.producer_id);
      const profiles: any[] = [];
      for (const id of ids) {
        const { data } = await supabase.rpc("get_directory_profile", { profile_id: id });
        if (data?.[0]) profiles.push(data[0]);
      }

      setLots(lotRows);
      setProducers(profiles);
      setLoading(false);
    })();
  }, [user]);

  return (
    <DashLayout title="Mes favoris" subtitle="Lots et producteurs que vous suivez." nav={BUYER_NAV}>
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
        <div className="space-y-12">
          <section>
            <h2 className="font-display text-2xl mb-4">Lots favoris</h2>
            {lots.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun lot favori — explorez la section Découvrir.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {lots.map((l) => (
                  <article key={l.id} className="border border-border rounded-md overflow-hidden bg-card">
                    {l.photo_url ? <img src={l.photo_url} className="aspect-video w-full object-cover" alt={l.name} />
                      : <div className="aspect-video bg-muted grid place-items-center"><Coffee className="w-6 h-6 text-muted-foreground" /></div>}
                    <div className="p-4">
                      <h3 className="font-display text-lg">{l.name}</h3>
                      <div className="mt-2 flex justify-between text-sm">
                        <span>{Number(l.volume_kg)} kg</span>
                        <span>{formatPrice(Number(l.price_per_kg), l.currency)} / kg</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-display text-2xl mb-4">Producteurs favoris</h2>
            {producers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun producteur favori.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {producers.map((p) => (
                  <article key={p.id} className="border border-border rounded-md overflow-hidden bg-card">
                    {p.photo_url ? <img src={p.photo_url} className="aspect-video w-full object-cover" alt="" />
                      : <div className="aspect-video bg-muted" />}
                    <div className="p-4">
                      <h3 className="font-display text-lg">{p.company ?? p.full_name}</h3>
                      <p className="text-xs text-muted-foreground">{p.country} {p.region ? `· ${p.region}` : ""}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </DashLayout>
  );
};

const Favorites = () => (
  <RoleGate allow={["shop", "torrefacteur"]}>
    <Inner />
  </RoleGate>
);
export default Favorites;
