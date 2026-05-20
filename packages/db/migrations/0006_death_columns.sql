-- Phase 6: death mechanic. The bagimons table already has is_alive + died_at
-- from 0001; add the columns the mood loop needs to snapshot final state, plus
-- the bot's idempotency guard for the death announcement.

alter table bagimons add column if not exists death_announced boolean not null default false;
alter table bagimons add column if not exists final_mood text;
alter table bagimons add column if not exists final_price_usd numeric;
alter table bagimons add column if not exists final_volume24h_usd numeric;

create index if not exists idx_bagimons_dead_unannounced
  on bagimons(is_alive, death_announced)
  where is_alive = false and death_announced = false;
