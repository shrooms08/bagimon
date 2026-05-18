import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types.js';

export type BagimonSupabaseClient = SupabaseClient<Database>;

export interface SupabaseConfig {
  url: string;
  key: string;
}

export function createServerClient(config: SupabaseConfig): BagimonSupabaseClient {
  return createClient<Database>(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createPublicClient(config: SupabaseConfig): BagimonSupabaseClient {
  return createClient<Database>(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
