import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

// VIES (VAT Information Exchange System) - free EU VAT validation
// REST endpoint: https://ec.europa.eu/taxation_customs/vies/rest-api/

const BodySchema = z.object({
  vat_number: z.string().trim().min(4).max(20),
  country_code: z.string().trim().length(2).toUpperCase(),
});

interface ViesResponse {
  isValid: boolean;
  requestDate: string;
  userError: string;
  name: string;
  address: string;
  countryCode: string;
  vatNumber: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Validate body
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { country_code, vat_number } = parsed.data;
    // Strip non-alphanumeric chars and any leading country prefix
    let normalized = vat_number.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (normalized.startsWith(country_code)) {
      normalized = normalized.slice(country_code.length);
    }

    // Call VIES REST API
    const viesUrl = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${country_code}/vat/${normalized}`;
    const viesRes = await fetch(viesUrl, {
      headers: { Accept: "application/json" },
    });

    if (!viesRes.ok) {
      return new Response(
        JSON.stringify({ error: "VIES service unavailable", status: viesRes.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const vies = (await viesRes.json()) as ViesResponse;

    // Use service role to update profile fields (vat_verified is admin-only at the row level)
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRole);

    const updates: Record<string, unknown> = {
      vat_number: `${country_code}${normalized}`,
      vat_country_code: country_code,
      vat_verified: vies.isValid === true,
      vat_verified_at: vies.isValid ? new Date().toISOString() : null,
    };
    if (vies.isValid && vies.name) {
      updates.legal_name = vies.name;
    }

    const { error: updateErr } = await adminClient
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        valid: vies.isValid,
        legal_name: vies.name || null,
        address: vies.address || null,
        country_code,
        vat_number: normalized,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("verify-vat error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
