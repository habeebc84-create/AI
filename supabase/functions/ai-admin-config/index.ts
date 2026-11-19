// FocusEd AI — ai-admin-config Edge Function
// supabase/functions/ai-admin-config/index.ts
//
// Admin-only management of ai_provider_configs and institution_settings.
// Keys are NEVER accepted or stored here — providers are configured by
// name/model/settings only; secrets live in Supabase secrets / env vars.
//
//   GET  /ai-admin-config              -> active config + settings for admin's institution
//   POST /ai-admin-config              -> upsert provider config (admin only)
//        { provider, model, isActive, maxTokens, temperature, systemPrompt }
//   PATCH /ai-admin-config/settings    -> update institution_settings (admin only)
//
// No live Supabase project is connected yet; deploy with `supabase functions deploy`.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function error(status: number, code: string, message: string): Response {
  return json(status, { error: { code, message } });
}

const PROVIDERS = new Set(["openai", "gemini", "anthropic"]);

// Reject any key-like field outright — secrets must never reach this endpoint.
const FORBIDDEN_KEYS = ["api_key", "apikey", "apiKey", "secret", "token", "password"];

function containsSecretField(obj: Record<string, unknown>): string | null {
  for (const k of Object.keys(obj)) {
    if (FORBIDDEN_KEYS.includes(k)) return k;
  }
  return null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return error(401, "unauthorized", "Missing or invalid Authorization header.");
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return error(401, "unauthorized", "Invalid or expired token.");
  }
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Admin of which institution? (admins are institution-scoped)
  const { data: membership } = await admin
    .from("institution_memberships")
    .select("institution_id")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .eq("status", "active")
    .limit(1)
    .single();
  if (!membership) {
    return error(403, "forbidden", "Only institution admins can manage AI configuration.");
  }
  const institutionId = membership.institution_id as string;
  const url = new URL(req.url);

  // --- GET: current config + settings ---
  if (req.method === "GET") {
    const [{ data: configs }, { data: settings }] = await Promise.all([
      admin.from("ai_provider_configs").select("*").eq("institution_id", institutionId),
      admin.from("institution_settings").select("*").eq("institution_id", institutionId).single(),
    ]);
    return json(200, { configs: configs ?? [], settings: settings ?? null });
  }

  // --- POST: upsert a provider config ---
  if (req.method === "POST" && !url.pathname.endsWith("/settings")) {
    let raw: unknown;
    try { raw = await req.json(); } catch {
      return error(400, "invalid_json", "Request body must be valid JSON.");
    }
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return error(400, "validation_error", "Body must be a JSON object.");
    }
    const b = raw as Record<string, unknown>;
    const secretField = containsSecretField(b);
    if (secretField) {
      return error(400, "validation_error", `Field '${secretField}' is not allowed here. API keys live in server env vars only.`);
    }
    if (typeof b.provider !== "string" || !PROVIDERS.has(b.provider)) {
      return error(400, "validation_error", "provider must be one of: openai, gemini, anthropic.");
    }
    if (typeof b.model !== "string" || b.model.trim().length === 0 || b.model.length > 100) {
      return error(400, "validation_error", "model is required and must be a non-empty string.");
    }
    if (b.maxTokens !== undefined && (typeof b.maxTokens !== "number" || !Number.isInteger(b.maxTokens) || b.maxTokens < 1 || b.maxTokens > 8192)) {
      return error(400, "validation_error", "maxTokens must be an integer between 1 and 8192.");
    }
    if (b.temperature !== undefined && (typeof b.temperature !== "number" || b.temperature < 0 || b.temperature > 2)) {
      return error(400, "validation_error", "temperature must be a number between 0 and 2.");
    }
    if (b.systemPrompt !== undefined && (typeof b.systemPrompt !== "string" || b.systemPrompt.length > 4000)) {
      return error(400, "validation_error", "systemPrompt must be a string of at most 4000 characters.");
    }
    if (b.isActive !== undefined && typeof b.isActive !== "boolean") {
      return error(400, "validation_error", "isActive must be a boolean.");
    }

    const row = {
      institution_id: institutionId,
      provider: b.provider,
      model: b.model.trim(),
      is_active: b.isActive ?? false,
      max_tokens: b.maxTokens ?? 1024,
      temperature: b.temperature ?? 0.7,
      system_prompt: (b.systemPrompt as string | undefined) ?? null,
    };

    // Only one active provider per institution: deactivate the others first.
    if (row.is_active) {
      await admin.from("ai_provider_configs")
        .update({ is_active: false })
        .eq("institution_id", institutionId);
    }
    const { data, error: upsertError } = await admin
      .from("ai_provider_configs")
      .upsert(row, { onConflict: "institution_id,provider" })
      .select()
      .single();
    if (upsertError) {
      return error(500, "internal_error", "Could not save provider configuration.");
    }
    await admin.from("audit_logs").insert({
      institution_id: institutionId,
      actor_id: user.id,
      action: "ai_provider_config.upsert",
      entity_type: "ai_provider_configs",
      entity_id: data.id,
      metadata: { provider: row.provider, model: row.model, is_active: row.is_active },
    });
    return json(200, { config: data });
  }

  // --- PATCH: institution settings ---
  if (req.method === "PATCH" && url.pathname.endsWith("/settings")) {
    let raw: unknown;
    try { raw = await req.json(); } catch {
      return error(400, "invalid_json", "Request body must be valid JSON.");
    }
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return error(400, "validation_error", "Body must be a JSON object.");
    }
    const b = raw as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    const boolFields = ["ai_enabled", "allow_parent_view_submissions", "allow_student_ai"];
    for (const f of boolFields) {
      if (b[f] !== undefined) {
        if (typeof b[f] !== "boolean") return error(400, "validation_error", `${f} must be a boolean.`);
        patch[f] = b[f];
      }
    }
    if (b.ai_daily_message_limit !== undefined) {
      if (typeof b.ai_daily_message_limit !== "number" || !Number.isInteger(b.ai_daily_message_limit) || b.ai_daily_message_limit < 0) {
        return error(400, "validation_error", "ai_daily_message_limit must be a non-negative integer.");
      }
      patch.ai_daily_message_limit = b.ai_daily_message_limit;
    }
    if (b.focus_default_minutes !== undefined) {
      if (typeof b.focus_default_minutes !== "number" || !Number.isInteger(b.focus_default_minutes) || b.focus_default_minutes < 1) {
        return error(400, "validation_error", "focus_default_minutes must be a positive integer.");
      }
      patch.focus_default_minutes = b.focus_default_minutes;
    }
    if (Object.keys(patch).length === 0) {
      return error(400, "validation_error", "No valid settings fields provided.");
    }
    const { data, error: updateError } = await admin
      .from("institution_settings")
      .update(patch)
      .eq("institution_id", institutionId)
      .select()
      .single();
    if (updateError) {
      return error(500, "internal_error", "Could not update institution settings.");
    }
    return json(200, { settings: data });
  }

  return error(404, "not_found", "Route not found.");
});
