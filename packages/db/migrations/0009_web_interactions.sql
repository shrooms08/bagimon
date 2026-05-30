-- Phase 7.4: wallet-gated holder interactions on the Petdex web app.
-- Web feed/pet actions share the existing `interactions` table with Discord
-- `/bagimon pet`, so the Petdex "recent interactions" feed shows both sources.
--
-- The existing `source` column means *generation method* (haiku vs static
-- fallback) for Discord rows — we do NOT overload it. Platform is tracked by a
-- new `channel` column instead. The two Discord-specific NOT NULLs are relaxed
-- so web rows can omit them.

alter table interactions
  alter column petter_discord_user_id drop not null,
  alter column petter_discord_display_name drop not null;

-- Existing rows are all Discord pets.
alter table interactions
  add column channel text not null default 'discord' check (channel in ('discord', 'web')),
  add column actor_wallet text,
  add column action_type text not null default 'pet' check (action_type in ('pet', 'feed'));

-- Cooldown lookups: "has this wallet done this action on this bagimon recently?"
create index if not exists idx_interactions_wallet_bagimon
  on interactions(actor_wallet, bagimon_id, created_at desc);

-- Engagement counters + last-fed memory surfaced on the Petdex.
alter table bagimons
  add column times_fed integer not null default 0,
  add column times_pet integer not null default 0,
  add column last_fed_at timestamptz,
  add column last_fed_by text,
  add column last_interaction_at timestamptz;
