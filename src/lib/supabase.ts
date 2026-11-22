/**
 * Supabase client — optional future, intentionally inert.
 * The app stores everything locally on this computer by design
 * (browser localStorage). If VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY are ever set, this returns a real client;
 * otherwise it returns null. No service-role key is ever read here.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export const isSupabaseConfigured = Boolean(supabase)

export const SUPABASE_SETUP_STEPS = [
  'Create a project at supabase.com and copy its Project URL and anon key.',
  'Create .env from .env.example and paste VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (never commit .env).',
  'In the Supabase SQL editor, run supabase/migrations/0001_init.sql, then supabase/seed.sql (after creating the matching Auth users).',
  'Deploy the Edge Functions in supabase/functions/ with: supabase functions deploy ai-tutor ai-admin-config assignment-actions guardian-invitations notification-worker',
  'Set the AI provider secret in the Edge Function (e.g. supabase secrets set OPENAI_API_KEY=...). Keys live server-side only.',
  'Integrate Supabase Auth and data access into the frontend before deploying shared mode.',
]
