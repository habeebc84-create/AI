# FocusEd AI — AI Setup

**Status: not connected.** No AI provider key is configured anywhere in
this repo, and the `ai-tutor` Edge Function has never called a live
provider. Until the steps below are done, the AI tutor runs only in the
frontend's Demo Mode with scripted replies.

## How it works

The tutor is provider-agnostic. The institution admin picks a provider
and model in the admin UI; the choice is stored in `ai_provider_configs`
(provider, model, max tokens, temperature, system prompt — **never an
API key**). At request time the `ai-tutor` Edge Function:

1. Verifies the caller's JWT.
2. Enforces the daily limit (`ai_usage_records` today + the institution's
   `ai_daily_message_limit`, default 50).
3. Loads the institution's active provider config.
4. Calls the provider with the key from **server-side env vars only**.
5. Persists the messages and a usage record, and returns the reply.

## Supported providers

| Provider | Env var | Default model (seed) | Notes |
|---|---|---|---|
| OpenAI-compatible | `OPENAI_API_KEY` (+ optional `OPENAI_BASE_URL`, default `https://api.openai.com/v1`) | `gpt-4o-mini` | Any OpenAI-compatible endpoint can be used via `OPENAI_BASE_URL`, but the host must be on the allowlist (see below). |
| Gemini | `GEMINI_API_KEY` | set in admin UI | Google AI Studio key |
| Anthropic | `ANTHROPIC_API_KEY` | set in admin UI | Console key |

## Setting it up

1. Get a key from your chosen provider (their console, billed to you).
2. Set it as a Supabase secret — never in the frontend, never in git:

```bash
supabase secrets set OPENAI_API_KEY=sk-...        # or GEMINI_API_KEY / ANTHROPIC_API_KEY
supabase functions deploy ai-tutor
```

3. As an institution admin, open the admin AI settings and activate the
   provider + model. (The seed activates OpenAI `gpt-4o-mini` with
   max tokens 1024, temperature 0.70.)
4. Test with one student message; check `ai_usage_records` for the
   token counts and latency.

## Safety guards (implemented in `ai-tutor/index.ts`)

- **SSRF endpoint validation:** provider fetches go only to HTTPS hosts
  in the allowlist — `api.openai.com`, `generativelanguage.googleapis.com`,
  `api.anthropic.com`. A custom `OPENAI_BASE_URL` pointing elsewhere is
  rejected. (If you self-host an OpenAI-compatible endpoint, add its host
  to `ALLOWED_HOSTS` deliberately and redeploy.)
- **Timeout:** 30 seconds per provider call (`FETCH_TIMEOUT_MS`); a
  timeout returns HTTP 504, not a hang.
- **Max tokens / temperature:** capped by the admin config (max tokens
  1–8192, temperature 0–2), validated in `ai-admin-config`.
- **Rate-limit guard:** per-user daily cap (50) and per-institution cap
  from `institution_settings`; exceeding either returns HTTP 429.
- **Input validation:** message required, ≤ 4000 chars; conversation and
  subject IDs validated.
- **Secrets:** keys are read from `Deno.env` only. The admin endpoint
  rejects any request containing a key-like field (`api_key`, `secret`,
  `token`, `password`). Error responses never echo secrets.
- **System prompt:** the tutor is instructed to explain step by step,
  never complete a whole assignment for the student, and end with a
  check question.

## Costs
Each call is metered in `ai_usage_records` (input/output tokens,
latency, success). Use the admin dashboard / SQL to watch usage per
institution and per user. There is no billing integration — provider
costs are whatever your provider charges.

## Demo Mode behaviour
Without env vars, the frontend tutor uses scripted demo replies stored
locally. It does not call any provider and costs nothing.
