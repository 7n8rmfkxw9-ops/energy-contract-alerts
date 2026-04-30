// Traduit un message dans la langue cible via Lovable AI Gateway.
// Sécurité : seul un participant à la conversation peut déclencher la traduction.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI gateway not configured" }, 500);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { message_id, target_lang } = await req.json();
    if (typeof message_id !== "string" || typeof target_lang !== "string" || target_lang.length > 8) {
      return json({ error: "Invalid input" }, 400);
    }

    // Use service role to read the message safely & verify membership
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: msg, error: msgErr } = await admin
      .from("messages").select("id, body, source_lang, conversation_id, translated_body, translated_lang")
      .eq("id", message_id).maybeSingle();
    if (msgErr || !msg) return json({ error: "Message not found" }, 404);

    const { data: conv } = await admin.from("conversations")
      .select("buyer_id, producer_id").eq("id", msg.conversation_id).maybeSingle();
    if (!conv || (conv.buyer_id !== user.id && conv.producer_id !== user.id)) {
      return json({ error: "Forbidden" }, 403);
    }

    if (msg.translated_body && msg.translated_lang === target_lang) {
      return json({ translated_body: msg.translated_body, translated_lang: msg.translated_lang });
    }

    // Call Lovable AI gateway
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content:
            `You are a translator for a coffee marketplace. Translate the user's message into the language code "${target_lang}". Preserve tone, names, units. Return ONLY the translation, no preamble.` },
          { role: "user", content: msg.body },
        ],
      }),
    });

    if (aiResp.status === 429) return json({ error: "Rate limit, réessayez bientôt." }, 429);
    if (aiResp.status === 402) return json({ error: "Crédits IA épuisés." }, 402);
    if (!aiResp.ok) return json({ error: "Translation failed" }, 502);

    const data = await aiResp.json();
    const translated = data?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!translated) return json({ error: "Empty translation" }, 502);

    await admin.from("messages")
      .update({ translated_body: translated, translated_lang: target_lang })
      .eq("id", message_id);

    return json({ translated_body: translated, translated_lang: target_lang });
  } catch (e) {
    console.error("translate-message error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
