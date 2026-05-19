-- Phase 4: Claude Haiku personality layer.
-- interactions: short-term memory (last 3 fed back into the next pet prompt).
-- ai_calls:     append-only audit log for cost monitoring.

create table if not exists interactions (
  id uuid primary key default gen_random_uuid(),
  bagimon_id uuid not null references bagimons(id) on delete cascade,
  petter_discord_user_id text not null,
  petter_discord_display_name text not null,
  response_text text not null,
  source text not null check (source in ('haiku', 'fallback')),
  created_at timestamptz not null default now()
);

create index if not exists idx_interactions_bagimon_recent
  on interactions(bagimon_id, created_at desc);

create table if not exists ai_calls (
  id uuid primary key default gen_random_uuid(),
  bagimon_id uuid references bagimons(id) on delete set null,
  discord_user_id text not null,
  model text not null,
  input_tokens integer not null,
  output_tokens integer not null,
  cost_usd_estimate numeric(10, 8) not null,
  latency_ms integer not null,
  succeeded boolean not null,
  fallback_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_calls_created_at on ai_calls(created_at desc);
