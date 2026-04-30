import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Send, Languages } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { toast } from "@/hooks/use-toast";
import { DashLayout } from "@/components/dashboard/DashLayout";
import { AuthGate } from "@/components/RoleGate";
import { BUYER_NAV } from "./BuyerProfile";

const PRODUCER_NAV = [
  { to: "/dashboard/producer", label: "Ma ferme" },
  { to: "/dashboard/producer/lots", label: "Mes lots" },
  { to: "/dashboard/messages", label: "Messages" },
];

type Msg = {
  id: string; conversation_id: string; sender_id: string;
  body: string; source_lang: string | null;
  translated_body: string | null; translated_lang: string | null;
  read_at: string | null; created_at: string;
};
type Conv = { id: string; lot_id: string; buyer_id: string; producer_id: string };

const detectBrowserLang = () => (navigator.language || "fr").split("-")[0];

const Inner = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isProducer } = useUserRoles();
  const [conv, setConv] = useState<Conv | null>(null);
  const [lotName, setLotName] = useState<string>("");
  const [otherName, setOtherName] = useState<string>("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [translating, setTranslating] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [showOriginal, setShowOriginal] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data: c } = await supabase.from("conversations").select("*").eq("id", id).maybeSingle();
      if (!c) { navigate("/dashboard/messages"); return; }
      setConv(c as Conv);

      const [{ data: lot }, otherRes] = await Promise.all([
        supabase.from("coffee_lots").select("name").eq("id", c.lot_id).maybeSingle(),
        supabase.rpc("get_directory_profile", { profile_id: c.buyer_id === user.id ? c.producer_id : c.buyer_id }),
      ]);
      setLotName(lot?.name ?? "");
      const other = (otherRes.data ?? [])[0];
      setOtherName(other?.company ?? other?.full_name ?? "Membre");

      const { data: msgs } = await supabase.from("messages").select("*")
        .eq("conversation_id", id).order("created_at");
      setMessages((msgs ?? []) as Msg[]);
      setLoading(false);

      // mark unread received messages as read
      const unread = (msgs ?? []).filter((m: Msg) => m.sender_id !== user.id && !m.read_at);
      if (unread.length) {
        await supabase.from("messages").update({ read_at: new Date().toISOString() })
          .in("id", unread.map((m: Msg) => m.id));
      }
    })();
  }, [id, user, navigate]);

  // realtime subscription
  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel(`conv-${id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !body.trim()) return;
    setSending(true);
    const text = body.trim().slice(0, 4000);
    const { error } = await supabase.from("messages").insert([{
      conversation_id: id, sender_id: user.id, body: text,
      source_lang: detectBrowserLang(),
    }]);
    setSending(false);
    if (error) {
      toast({ title: "Envoi impossible", description: error.message, variant: "destructive" });
    } else {
      setBody("");
    }
  };

  const translate = async (m: Msg) => {
    if (m.translated_body) return; // already translated
    setTranslating(m.id);
    const target = detectBrowserLang();
    try {
      const { data, error } = await supabase.functions.invoke("translate-message", {
        body: { message_id: m.id, target_lang: target },
      });
      if (error) throw error;
      setMessages((prev) => prev.map((x) => x.id === m.id ? {
        ...x, translated_body: data?.translated_body, translated_lang: data?.translated_lang,
      } : x));
    } catch (e: any) {
      toast({ title: "Traduction impossible", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setTranslating(null);
    }
  };

  const toggleOriginal = (mid: string) => {
    setShowOriginal((s) => {
      const n = new Set(s);
      if (n.has(mid)) n.delete(mid); else n.add(mid);
      return n;
    });
  };

  return (
    <DashLayout title={otherName || "Conversation"} subtitle={lotName ? `À propos du lot « ${lotName} »` : undefined}
      nav={isProducer ? PRODUCER_NAV : BUYER_NAV}>
      <button onClick={() => navigate("/dashboard/messages")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Tous les messages
      </button>

      <div className="border border-border rounded-md bg-card max-w-3xl flex flex-col h-[65vh]">
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> :
           messages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">Démarrez la conversation.</p>
          ) : messages.map((m) => {
            const mine = m.sender_id === user?.id;
            const display = m.translated_body && !showOriginal.has(m.id) ? m.translated_body : m.body;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                  mine ? "bg-foreground text-background rounded-br-sm"
                       : "bg-muted text-foreground rounded-bl-sm"
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{display}</p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] opacity-70">
                    <span>{new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                    {!mine && (
                      m.translated_body ? (
                        <button onClick={() => toggleOriginal(m.id)} className="inline-flex items-center gap-1 underline">
                          {showOriginal.has(m.id) ? "Voir traduction" : `Voir original (${m.source_lang ?? "?"})`}
                        </button>
                      ) : (
                        <button onClick={() => translate(m)} disabled={translating === m.id}
                          className="inline-flex items-center gap-1 underline disabled:opacity-60">
                          {translating === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                          Traduire
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="border-t border-border p-3 flex gap-2">
          <textarea
            value={body} onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e as any); }}}
            rows={1} maxLength={4000}
            placeholder="Écrivez votre message…"
            className="flex-1 px-4 py-2 rounded-md border border-border bg-background resize-none"
          />
          <button type="submit" disabled={sending || !body.trim()}
            className="px-4 py-2 rounded-full bg-terracotta text-accent-foreground disabled:opacity-60">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </DashLayout>
  );
};

const ConversationView = () => (
  <AuthGate><Inner /></AuthGate>
);
export default ConversationView;
