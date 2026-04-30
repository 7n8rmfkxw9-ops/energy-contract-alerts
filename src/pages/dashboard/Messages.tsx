import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { DashLayout } from "@/components/dashboard/DashLayout";
import { AuthGate } from "@/components/RoleGate";
import { BUYER_NAV } from "./BuyerProfile";

const PRODUCER_NAV = [
  { to: "/dashboard/producer", label: "Ma ferme" },
  { to: "/dashboard/producer/lots", label: "Mes lots" },
  { to: "/dashboard/messages", label: "Messages" },
];

type ConvRow = {
  id: string;
  lot_id: string;
  buyer_id: string;
  producer_id: string;
  last_message_at: string;
  lot_name?: string;
  other_name?: string;
};

const Inner = () => {
  const { user } = useAuth();
  const { isProducer } = useUserRoles();
  const [loading, setLoading] = useState(true);
  const [convs, setConvs] = useState<ConvRow[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("conversations").select("*")
        .order("last_message_at", { ascending: false });
      const rows = (data ?? []) as ConvRow[];
      // hydrate lot names + other party name
      const enriched = await Promise.all(rows.map(async (c) => {
        const [lotRes, otherRes] = await Promise.all([
          supabase.from("coffee_lots").select("name").eq("id", c.lot_id).maybeSingle(),
          supabase.rpc("get_directory_profile", { profile_id: c.buyer_id === user.id ? c.producer_id : c.buyer_id }),
        ]);
        const other = (otherRes.data ?? [])[0];
        return {
          ...c,
          lot_name: lotRes.data?.name,
          other_name: other?.company ?? other?.full_name ?? "Membre",
        };
      }));
      setConvs(enriched);
      setLoading(false);
    })();
  }, [user]);

  return (
    <DashLayout title="Messages" subtitle="Vos échanges directs avec producteurs et acheteurs."
      nav={isProducer ? PRODUCER_NAV : BUYER_NAV}>
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : convs.length === 0 ? (
        <div className="border border-dashed border-border rounded-md p-12 text-center">
          <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="mt-3 text-muted-foreground text-sm">Aucune conversation pour l'instant.</p>
        </div>
      ) : (
        <div className="border border-border rounded-md divide-y divide-border bg-card max-w-3xl">
          {convs.map((c) => (
            <Link key={c.id} to={`/dashboard/messages/${c.id}`}
              className="block px-5 py-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="font-medium">{c.other_name}</p>
                  <p className="text-xs text-muted-foreground">à propos de {c.lot_name ?? "un lot"}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(c.last_message_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashLayout>
  );
};

const Messages = () => (
  <AuthGate><Inner /></AuthGate>
);
export default Messages;
