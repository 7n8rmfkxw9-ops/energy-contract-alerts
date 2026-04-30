import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Sparkles, Coffee, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { DashLayout } from "@/components/dashboard/DashLayout";
import { RoleGate } from "@/components/RoleGate";
import { BUYER_NAV } from "./BuyerProfile";
import { PROCESS_LABELS, formatPrice, type Lot } from "@/lib/lots";

type Match = { lot_id: string; score: number; why: string };
type LotWithProducer = Lot & { producer?: { full_name: string | null; company: string | null; country: string | null } };

const Inner = () => {
  const { user } = useAuth();
  const [lots, setLots] = useState<LotWithProducer[]>([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [matches, setMatches] = useState<Record<string, Match>>({});
  const [favoriteLotIds, setFavoriteLotIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("coffee_lots").select("*").eq("status", "available")
        .order("created_at", { ascending: false }).limit(60),
      supabase.from("lot_favorites").select("lot_id").eq("user_id", user.id),
    ]).then(async ([lotsRes, favRes]) => {
      const list = (lotsRes.data ?? []) as Lot[];
      // hydrate producers via directory function (verified profiles only)
      const enriched: LotWithProducer[] = await Promise.all(list.map(async (l) => {
        const { data } = await supabase.rpc("get_directory_profile", { profile_id: l.producer_id });
        const p = (data ?? [])[0];
        return { ...l, producer: p ? { full_name: p.full_name, company: p.company, country: p.country } : undefined };
      }));
      setLots(enriched.filter((l) => l.producer)); // only verified producers
      setFavoriteLotIds(new Set((favRes.data ?? []).map((f) => f.lot_id)));
      setLoading(false);
    });
  }, [user]);

  const askAgent = async () => {
    setMatching(true);
    try {
      const { data, error } = await supabase.functions.invoke("match-lots", { body: {} });
      if (error) throw error;
      const m: Match[] = data?.matches ?? [];
      const byId: Record<string, Match> = {};
      m.forEach((x) => { byId[x.lot_id] = x; });
      setMatches(byId);
      setLots((prev) => [...prev].sort((a, b) => (byId[b.id]?.score ?? 0) - (byId[a.id]?.score ?? 0)));
      toast({ title: "Sélection mise à jour", description: "L'agent Terra a hiérarchisé les lots selon vos préférences." });
    } catch (e: any) {
      toast({ title: "Agent indisponible", description: e?.message ?? "Réessayez plus tard.", variant: "destructive" });
    } finally {
      setMatching(false);
    }
  };

  const toggleFav = async (lotId: string) => {
    if (!user) return;
    if (favoriteLotIds.has(lotId)) {
      await supabase.from("lot_favorites").delete().eq("user_id", user.id).eq("lot_id", lotId);
      setFavoriteLotIds((s) => { const n = new Set(s); n.delete(lotId); return n; });
    } else {
      await supabase.from("lot_favorites").insert([{ user_id: user.id, lot_id: lotId }]);
      setFavoriteLotIds((s) => new Set(s).add(lotId));
    }
  };

  const startConversation = async (lot: LotWithProducer) => {
    if (!user) return;
    const { data: existing } = await supabase
      .from("conversations").select("id")
      .eq("lot_id", lot.id).eq("buyer_id", user.id).eq("producer_id", lot.producer_id)
      .maybeSingle();
    let convId = existing?.id;
    if (!convId) {
      const { data, error } = await supabase.from("conversations")
        .insert([{ lot_id: lot.id, buyer_id: user.id, producer_id: lot.producer_id }])
        .select("id").maybeSingle();
      if (error) {
        toast({ title: "Conversation impossible", description: error.message, variant: "destructive" });
        return;
      }
      convId = data?.id;
    }
    if (convId) window.location.href = `/dashboard/messages/${convId}`;
  };

  return (
    <DashLayout
      title="Découvrir des lots"
      subtitle="Lots disponibles publiés par des producteurs vérifiés. L'agent Terra peut hiérarchiser cette liste selon vos préférences."
      nav={BUYER_NAV}
    >
      <div className="flex justify-end mb-6">
        <button
          onClick={askAgent}
          disabled={matching}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-terracotta text-accent-foreground font-medium disabled:opacity-60"
        >
          {matching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Demander à l'agent Terra
        </button>
      </div>

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      ) : lots.length === 0 ? (
        <div className="border border-dashed border-border rounded-md p-12 text-center text-muted-foreground">
          Aucun lot disponible pour le moment.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lots.map((lot) => {
            const m = matches[lot.id];
            return (
              <article key={lot.id} className="border border-border rounded-md overflow-hidden bg-card flex flex-col">
                <div className="relative">
                  {lot.photo_url ? (
                    <img src={lot.photo_url} alt={lot.name} className="w-full aspect-video object-cover" />
                  ) : (
                    <div className="w-full aspect-video bg-muted grid place-items-center"><Coffee className="w-8 h-8 text-muted-foreground" /></div>
                  )}
                  <button onClick={() => toggleFav(lot.id)}
                    className="absolute top-2 right-2 p-2 rounded-full bg-background/90 hover:bg-background">
                    <Heart className={`w-4 h-4 ${favoriteLotIds.has(lot.id) ? "fill-terracotta text-terracotta" : "text-muted-foreground"}`} />
                  </button>
                  {m && (
                    <span className="absolute top-2 left-2 text-xs px-2 py-1 rounded-full bg-foreground text-background">
                      {Math.round(m.score)}% match
                    </span>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-display text-lg leading-tight">{lot.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {lot.producer?.company ?? lot.producer?.full_name} · {lot.producer?.country}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {lot.variety && <Tag>{lot.variety}</Tag>}
                    {lot.process && <Tag>{PROCESS_LABELS[lot.process]}</Tag>}
                    {lot.sca_score && <Tag>SCA {Number(lot.sca_score)}</Tag>}
                  </div>
                  {(lot.flavor_notes?.length ?? 0) > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground italic line-clamp-2">
                      {lot.flavor_notes.join(" · ")}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span>{Number(lot.volume_kg)} kg</span>
                    <span className="font-medium">{formatPrice(Number(lot.price_per_kg), lot.currency)} / kg</span>
                  </div>
                  {m?.why && (
                    <p className="mt-3 text-xs text-foreground/80 border-l-2 border-terracotta pl-2">
                      {m.why}
                    </p>
                  )}
                  <button
                    onClick={() => startConversation(lot)}
                    className="mt-4 w-full px-4 py-2 rounded-full text-sm bg-foreground text-background hover:bg-foreground/90"
                  >
                    Contacter le producteur
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </DashLayout>
  );
};

const Tag = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted">{children}</span>
);

const Discover = () => (
  <RoleGate allow={["shop", "torrefacteur"]}>
    <Inner />
  </RoleGate>
);
export default Discover;
