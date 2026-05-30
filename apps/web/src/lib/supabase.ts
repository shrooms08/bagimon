import 'server-only';
import {
  createPublicClient,
  createServerClient,
  type BagimonSupabaseClient,
} from '@bagimon/db';

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

let cachedService: BagimonSupabaseClient | null = null;

// Service-role client for writes from holder-interaction API routes. RLS only
// grants anon read access, so inserts/updates must bypass RLS via the service
// role. Never expose this client to the browser — it lives only in route handlers.
export function getServiceSupabase(): BagimonSupabaseClient {
  if (cachedService) return cachedService;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for holder interactions',
    );
  }
  cachedService = createServerClient({ url, key });
  return cachedService;
}
