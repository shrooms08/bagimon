-- Phase 3: cache freshest coin stats on the bagimon row for cheap reads in
-- /bagimon stats and to drive mood transitions. last_stats_at is the heartbeat
-- for the polling loop and the freshness signal in the embed.

alter table bagimons add column if not exists last_stats_at timestamptz;
alter table bagimons add column if not exists last_price_usd numeric;
alter table bagimons add column if not exists last_volume24h_usd numeric;
alter table bagimons add column if not exists last_price_change_24h_pct numeric;

create index if not exists idx_bagimons_last_stats_at
  on bagimons(last_stats_at) where is_alive = true;
