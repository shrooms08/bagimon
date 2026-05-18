-- Bagimon initial schema.
-- One Bagimon per (discord_server_id, coin_mint). A server can host multiple
-- Bagimons (different coins). Live coin metadata (symbol, name) is denormalized
-- onto bagimons for cheap reads; Phase 3 webhooks keep it fresh.

create table bagimons (
  id uuid primary key default gen_random_uuid(),
  discord_server_id text not null,
  discord_server_name text,
  coin_mint text not null,
  coin_symbol text,
  coin_name text,
  current_mood text not null default 'happy' check (current_mood in ('happy','hungry','sick','thriving','dying')),
  is_alive boolean not null default true,
  born_at timestamptz not null default now(),
  died_at timestamptz,
  last_activity_at timestamptz not null default now(),
  spawned_by_discord_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (discord_server_id, coin_mint)
);

create index idx_bagimons_alive on bagimons(is_alive) where is_alive = true;
create index idx_bagimons_mint on bagimons(coin_mint);

create table mood_transitions (
  id uuid primary key default gen_random_uuid(),
  bagimon_id uuid not null references bagimons(id) on delete cascade,
  from_mood text,
  to_mood text not null,
  trigger_reason text,
  created_at timestamptz not null default now()
);

create index idx_mood_transitions_bagimon on mood_transitions(bagimon_id, created_at desc);

create table bagimon_parents (
  id uuid primary key default gen_random_uuid(),
  bagimon_id uuid not null references bagimons(id) on delete cascade,
  wallet_address text not null,
  rank integer not null,
  holding_amount numeric not null default 0,
  first_became_parent_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bagimon_id, wallet_address)
);

create index idx_bagimon_parents on bagimon_parents(bagimon_id, rank);
