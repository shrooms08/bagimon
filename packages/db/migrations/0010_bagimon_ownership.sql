-- Phase 7.6 — self-serve web spawn + creator-verified claim.
--
-- Two additions:
-- 1. Ownership: a coin's verified creator can CLAIM its Bagimon. This is an
--    ownership record proven by signature only — no custody, no funds, no
--    on-chain writes. owner_wallet is the claiming wallet.
-- 2. Web spawn: a Bagimon can now be created from the web (no Discord server).
--    created_via records the origin.

alter table bagimons
  add column owner_wallet text,
  add column claimed_at timestamptz,
  add column created_via text not null default 'discord'
    check (created_via in ('discord', 'web'));

create index if not exists idx_bagimons_owner_wallet on bagimons(owner_wallet);

-- Web-spawned Bagimons have no Discord server or spawning user. Relax the
-- Discord-only NOT NULLs; Discord spawns still populate them.
alter table bagimons
  alter column discord_server_id drop not null,
  alter column spawned_by_discord_user_id drop not null;

-- The legacy unique(discord_server_id, coin_mint) no longer guards web rows
-- (discord_server_id is null for them, and NULLs are distinct in a unique
-- constraint). Add a partial unique index so each coin has at most one
-- canonical web Bagimon — the DB-level guarantee behind the spawn route's
-- "if one already exists, return it" behavior.
create unique index if not exists idx_bagimons_web_mint
  on bagimons(coin_mint) where created_via = 'web';
