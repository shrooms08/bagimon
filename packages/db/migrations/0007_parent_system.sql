-- Phase 6.5: parent system.
-- Reshape bagimon_parents from a current-state table into a per-snapshot
-- history table. Each daily snapshot inserts up to 10 rows (one per rank)
-- with a shared snapshot_at timestamp. We keep historic snapshots so we
-- can show parent churn over time, then prune (TODO below).
--
-- Migration is safe to run multiple times.

-- Drop the legacy (bagimon_id, wallet_address) uniqueness — the same
-- wallet can appear across many snapshots.
alter table bagimon_parents
  drop constraint if exists bagimon_parents_bagimon_id_wallet_address_key;

-- snapshot_at: when this set of 10 rows was captured. Backfill existing
-- rows from updated_at (Phase 2 inserts), then enforce NOT NULL.
alter table bagimon_parents
  add column if not exists snapshot_at timestamptz;

update bagimon_parents
  set snapshot_at = coalesce(updated_at, first_became_parent_at, now())
  where snapshot_at is null;

alter table bagimon_parents
  alter column snapshot_at set not null,
  alter column snapshot_at set default now();

-- holding_percent_of_supply: 0–100, optional (Helius doesn't always give
-- this for free).
alter table bagimon_parents
  add column if not exists holding_percent_of_supply numeric;

-- Indexes the spec asks for.
create index if not exists idx_bagimon_parents_bagimon_snapshot
  on bagimon_parents(bagimon_id, snapshot_at desc);

-- idx_bagimon_parents (bagimon_id, rank) was created in 0001; recreate
-- under a stable name if missing.
create index if not exists idx_bagimon_parents_bagimon_rank
  on bagimon_parents(bagimon_id, rank);

-- Public read for the Petdex Family section.
-- (0005 already enabled RLS on bagimon_parents with a public-read policy
--  via `using (true)`, so no policy change is needed here.)

-- TODO(phase-6.6): periodic cleanup that keeps only the latest 7
-- snapshots per Bagimon. Without it, this table grows by
-- (alive_bagimons * 10) rows per day forever. Add a SQL function +
-- scheduled call, or do it in the worker after each snapshot.
