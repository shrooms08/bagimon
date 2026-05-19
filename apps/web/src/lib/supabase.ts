import 'server-only';
import { createPublicClient, type BagimonSupabaseClient } from '@bagimon/db';

let cached: BagimonSupabaseClient | null = null;

export function getSupabase(): BagimonSupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set for the web app');
  }
  cached = createPublicClient({ url, key });
  return cached;
}
