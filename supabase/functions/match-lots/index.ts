// Score les lots disponibles selon les préférences de l'acheteur.
// 1) Score déterministe sur origine, méthode, budget, profil aromatique, score SCA.
// 2) L'IA enrichit chaque suggestion avec une explication courte.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Prefs = {
  origins?: string[];
  processes?: string[];
  flavor_keywords?: string[];
  budget_per_kg_max?: number | null;
  monthly_volume_kg?: number | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: profile } = await admin
      .from("profiles").select("sourcing_preferences").eq("id", user.id).maybeSingle();
    const prefs: Prefs = (profile?.sourcing_preferences ?? {}) as Prefs;

    // Fetch available lots from verified producers
    const { data: lots } = await admin.from("coffee_lots")
      .select("id, name, variety, process, flavor_notes, sca_score, price_per_kg, currency, volume_kg, producer_id")
      .eq("status", "available").limit(100);
    if (!lots?.length) return json({ matches: [] });

    const producerIds = [...new Set(lots.map((l) => l.producer_id))];
    const { data: producers } = await admin.from("profiles")
      .select("id, country, region, verification_status").in("id", producerIds);
    const verifiedById = new Map((producers ?? []).filter((p) => p.verification_status === "verified")
      .map((p) => [p.id, p]));

    // Deterministic scoring (0-100)
    const scored = lots
      .filter((l) => verifiedById.has(l.producer_id))
      .map((l) => {
        const prod = verifiedById.get(l.producer_id)!;
        let score = 40; // base
        const reasons: string[] = [];

        if (prefs.origins?.length) {
          const inOrigin = prefs.origins.some((o) =>
            (prod.country ?? "").toLowerCase().includes(o.toLowerCase()) ||
            (prod.region ?? "").toLowerCase().includes(o.toLowerCase()));
          if (inOrigin) { score += 20; reasons.push(`origine ${prod.country}`); }
        }
        if (prefs.processes?.length && l.process && prefs.processes.includes(l.process)) {
          score += 15; reasons.push(`méthode ${l.process}`);
        }
        if (prefs.budget_per_kg_max != null) {
          if (Number(l.price_per_kg) <= prefs.budget_per_kg_max) {
            score += 10; reasons.push(`prix ≤ budget`);
          } else { score -= 15; }
        }
        if (prefs.flavor_keywords?.length && l.flavor_notes?.length) {
          const overlap = prefs.flavor_keywords.filter((k) =>
            l.flavor_notes!.some((n: string) => n.toLowerCase().includes(k.toLowerCase()))).length;
          if (overlap) { score += Math.min(15, overlap * 5); reasons.push(`profil aromatique`); }
        }
        if (l.sca_score && Number(l.sca_score) >= 85) { score += 5; reasons.push("score SCA élevé"); }

        return { lot_id: l.id, score: Math.max(0, Math.min(100, score)),
                 reasons, lot: l, producer: prod };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    // Enrich top 5 with LLM explanation
    let enriched = scored.map((s) => ({ lot_id: s.lot_id, score: s.score, why: s.reasons.join(", ") }));
    const top = scored.slice(0, 5);

    if (LOVABLE_API_KEY && top.length) {
      try {
        const summary = top.map((s, i) => ({
          i, name: s.lot.name, variety: s.lot.variety, process: s.lot.process,
          flavors: s.lot.flavor_notes, sca: s.lot.sca_score,
          price: `${s.lot.price_per_kg} ${s.lot.currency}/kg`, country: s.producer.country,
          score: s.score, signals: s.reasons,
        }));
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content:
                `You are Terra, a sourcing assistant for European coffee shops. For each lot, write ONE short sentence in French (max 22 words) explaining WHY it matches the buyer preferences. Tone: editorial, precise, no marketing fluff. Return JSON: {"items":[{"i":0,"why":"…"}]}` },
              { role: "user", content: JSON.stringify({ preferences: prefs, lots: summary }) },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (resp.ok) {
          const aiData = await resp.json();
          const txt = aiData?.choices?.[0]?.message?.content ?? "{}";
          const parsed = JSON.parse(txt);
          const byIdx: Record<number, string> = {};
          for (const it of (parsed.items ?? [])) byIdx[it.i] = it.why;
          enriched = enriched.map((e, idx) => ({
            ...e, why: byIdx[idx] ?? e.why,
          }));
        }
      } catch (e) {
        console.warn("LLM enrichment failed, falling back to deterministic reasons", e);
      }
    }

    return json({ matches: enriched });
  } catch (e) {
    console.error("match-lots error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
