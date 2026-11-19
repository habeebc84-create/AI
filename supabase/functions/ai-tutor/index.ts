// FocusEd AI — ai-tutor Edge Function
// supabase/functions/ai-tutor/index.ts
//
// POST /ai-tutor
//   { conversationId?: string, subjectId?: string, message: string }
//   -> { reply: string, conversationId: string, tokensUsed: number }
//
// Provider-agnostic: OpenAI-compatible, Gemini, Anthropic. The active
// provider/model come from ai_provider_configs for the caller's institution;
// API keys are read ONLY from server-side env vars (never from the client,
// never echoed in any response). No live Supabase project or provider key
// is connected yet — this function is structured and ready to deploy once
// env vars are set (see docs/AI_SETUP.md).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// SSRF guard: only these HTTPS hosts may be called as AI providers.
const ALLOWED_HOSTS = new Set([
  "api.openai.com",
  "generativelanguage.googleapis.com",
  "api.anthropic.com",
]);

const FETCH_TIMEOUT_MS = 30_000;
const MAX_MESSAGE_CHARS = 4_000;
const MAX_HISTORY_MESSAGES = 20;
const RATE_LIMIT_PER_DAY = 50; // mirrored by institution_settings.ai_daily_message_limit

// ---------------------------------------------------------------------------
// CORS + helpers
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

// Manual (Zod-style) input validation — no dependency, explicit checks.
function validateBody(raw: unknown): {
  ok: true;
  message: string;
  conversationId?: string;
  subjectId?: string;
} | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: "Body must be a JSON object." };
  }
  const b = raw as Record<string, unknown>;
  if (typeof b.message !== "string" || b.message.trim().length === 0) {
    return { ok: false, error: "message is required and must be a non-empty string." };
  }
  if (b.message.length > MAX_MESSAGE_CHARS) {
    return { ok: false, error: `message must be at most ${MAX_MESSAGE_CHARS} characters.` };
  }
  if (b.conversationId !== undefined && typeof b.conversationId !== "string") {
    return { ok: false, error: "conversationId must be a string." };
  }
  if (b.subjectId !== undefined && typeof b.subjectId !== "string") {
    return { ok: false, error: "subjectId must be a string." };
  }
  return {
    ok: true,
    message: b.message.trim(),
    conversationId: b.conversationId as string | undefined,
    subjectId: b.subjectId as string | undefined,
  };
}

// ---------------------------------------------------------------------------
// Provider adapters — all validate the endpoint host against the allowlist
// before any fetch (SSRF guard). Keys come from env vars only.
// ---------------------------------------------------------------------------

type ProviderName = "openai" | "gemini" | "anthropic";

interface ProviderResult {
  reply: string;
  tokensInput: number;
  tokensOutput: number;
}

function assertAllowedUrl(url: string): URL {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") {
    throw new Error("Provider endpoint must use HTTPS.");
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new Error(`Provider host not in allowlist: ${parsed.hostname}`);
  }
  return parsed;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  assertAllowedUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

interface ChatMsg {
  role: "user" | "assistant" | "system";
  content: string;
}

async function callOpenAICompatible(
  apiKey: string,
  baseUrl: string,
  model: string,
  messages: ChatMsg[],
  maxTokens: number,
  temperature: number,
): Promise<ProviderResult> {
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI-compatible provider returned ${res.status}.`);
  }
  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (typeof reply !== "string" || reply.length === 0) {
    throw new Error("Provider returned an empty reply.");
  }
  return {
    reply,
    tokensInput: data?.usage?.prompt_tokens ?? 0,
    tokensOutput: data?.usage?.completion_tokens ?? 0,
  };
}

async function callGemini(
  apiKey: string,
  model: string,
  messages: ChatMsg[],
  maxTokens: number,
  temperature: number,
): Promise<ProviderResult> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  const systemInstruction = messages.find((m) => m.role === "system");
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      ...(systemInstruction
        ? { systemInstruction: { parts: [{ text: systemInstruction.content }] } }
        : {}),
      generationConfig: { maxOutputTokens: maxTokens, temperature },
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini returned ${res.status}.`);
  }
  const data = await res.json();
  const reply = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
  if (typeof reply !== "string" || reply.length === 0) {
    throw new Error("Provider returned an empty reply.");
  }
  return {
    reply,
    tokensInput: data?.usageMetadata?.promptTokenCount ?? 0,
    tokensOutput: data?.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

async function callAnthropic(
  apiKey: string,
  model: string,
  messages: ChatMsg[],
  maxTokens: number,
  temperature: number,
): Promise<ProviderResult> {
  const url = "https://api.anthropic.com/v1/messages";
  const system = messages.find((m) => m.role === "system")?.content;
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      ...(system ? { system } : {}),
      messages: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic returned ${res.status}.`);
  }
  const data = await res.json();
  const reply = data?.content
    ?.filter((b: { type?: string }) => b.type === "text")
    .map((b: { text?: string }) => b.text ?? "")
    .join("");
  if (typeof reply !== "string" || reply.length === 0) {
    throw new Error("Provider returned an empty reply.");
  }
  return {
    reply,
    tokensInput: data?.usage?.input_tokens ?? 0,
    tokensOutput: data?.usage?.output_tokens ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return error(405, "method_not_allowed", "Only POST is supported.");
  }

  // --- JWT auth check via Supabase Auth header ---
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

  // --- Input validation ---
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return error(400, "invalid_json", "Request body must be valid JSON.");
  }
  const validated = validateBody(raw);
  if (!validated.ok) {
    return error(400, "validation_error", validated.error);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // --- Rate-limit guard: daily message count from ai_usage_records ---
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { count, error: countError } = await admin
    .from("ai_usage_records")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since.toISOString());
  if (countError) {
    return error(500, "internal_error", "Could not check usage limits.");
  }
  if ((count ?? 0) >= RATE_LIMIT_PER_DAY) {
    return error(429, "rate_limited", "Daily AI message limit reached. Try again tomorrow.");
  }

  // --- Resolve the caller's institution + active provider config ---
  const { data: membership } = await admin
    .from("institution_memberships")
    .select("institution_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .single();
  const institutionId = membership?.institution_id ?? null;

  let provider: ProviderName = "openai";
  let model = "gpt-4o-mini";
  let maxTokens = 1024;
  let temperature = 0.7;
  let systemPrompt =
    "You are FocusEd, a friendly homework tutor for school students. Explain step by step, never do the whole assignment for the student, and ask a check question at the end.";
  if (institutionId) {
    const { data: cfg } = await admin
      .from("ai_provider_configs")
      .select("*")
      .eq("institution_id", institutionId)
      .eq("is_active", true)
      .limit(1)
      .single();
    if (cfg) {
      provider = cfg.provider as ProviderName;
      model = cfg.model;
      maxTokens = cfg.max_tokens;
      temperature = Number(cfg.temperature);
      if (cfg.system_prompt) systemPrompt = cfg.system_prompt;
    }
    const { data: settings } = await admin
      .from("institution_settings")
      .select("ai_enabled, allow_student_ai, ai_daily_message_limit")
      .eq("institution_id", institutionId)
      .single();
    if (settings && (!settings.ai_enabled || !settings.allow_student_ai)) {
      return error(403, "ai_disabled", "AI tutoring is disabled for this institution.");
    }
    if (settings && (count ?? 0) >= settings.ai_daily_message_limit) {
      return error(429, "rate_limited", "Institution daily AI message limit reached.");
    }
  }

  // --- Conversation: reuse or create (owned by this student) ---
  let conversationId = validated.conversationId;
  if (conversationId) {
    const { data: conv } = await admin
      .from("ai_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("student_id", user.id)
      .single();
    if (!conv) {
      return error(404, "not_found", "Conversation not found.");
    }
  } else {
    const { data: conv, error: convError } = await admin
      .from("ai_conversations")
      .insert({
        student_id: user.id,
        subject_id: validated.subjectId ?? null,
        title: validated.message.slice(0, 60),
      })
      .select("id")
      .single();
    if (convError || !conv) {
      return error(500, "internal_error", "Could not create conversation.");
    }
    conversationId = conv.id;
  }

  // --- History for context (last N messages) ---
  const { data: history } = await admin
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY_MESSAGES);
  const messages: ChatMsg[] = [
    { role: "system", content: systemPrompt },
    ...((history ?? []).reverse() as ChatMsg[]),
    { role: "user", content: validated.message },
  ];

  // --- Provider key: server-side env var only ---
  const keyByProvider: Record<ProviderName, string | undefined> = {
    openai: Deno.env.get("OPENAI_API_KEY"),
    gemini: Deno.env.get("GEMINI_API_KEY"),
    anthropic: Deno.env.get("ANTHROPIC_API_KEY"),
  };
  const apiKey = keyByProvider[provider];
  if (!apiKey) {
    return error(503, "provider_not_configured", `No API key configured for provider '${provider}'.`);
  }

  // --- Call the provider ---
  let result: ProviderResult;
  const startedAt = Date.now();
  try {
    if (provider === "gemini") {
      result = await callGemini(apiKey, model, messages, maxTokens, temperature);
    } else if (provider === "anthropic") {
      result = await callAnthropic(apiKey, model, messages, maxTokens, temperature);
    } else {
      const baseUrl = Deno.env.get("OPENAI_BASE_URL") ?? "https://api.openai.com/v1";
      result = await callOpenAICompatible(apiKey, baseUrl, model, messages, maxTokens, temperature);
    }
  } catch (e) {
    const isTimeout = e instanceof DOMException && e.name === "AbortError";
    await admin.from("ai_usage_records").insert({
      user_id: user.id,
      institution_id: institutionId,
      provider,
      model,
      tokens_input: 0,
      tokens_output: 0,
      latency_ms: Date.now() - startedAt,
      success: false,
    });
    return error(
      isTimeout ? 504 : 502,
      isTimeout ? "provider_timeout" : "provider_error",
      isTimeout ? "The AI provider timed out." : "The AI provider returned an error.",
    );
  }

  // --- Persist messages + usage (service role) ---
  await admin.from("ai_messages").insert([
    { conversation_id: conversationId, role: "user", content: validated.message },
    {
      conversation_id: conversationId,
      role: "assistant",
      content: result.reply,
      tokens_used: result.tokensInput + result.tokensOutput,
    },
  ]);
  await admin.from("ai_usage_records").insert({
    user_id: user.id,
    institution_id: institutionId,
    provider,
    model,
    tokens_input: result.tokensInput,
    tokens_output: result.tokensOutput,
    latency_ms: Date.now() - startedAt,
    success: true,
  });

  return json(200, {
    reply: result.reply,
    conversationId,
    tokensUsed: result.tokensInput + result.tokensOutput,
  });
});
