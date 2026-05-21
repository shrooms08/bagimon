-- Phase 7.2a: cache Bags API data on bagimons table to avoid rate-limit issues
-- and ensure Petdex pages always render fast.

ALTER TABLE bagimons
  ADD COLUMN lifetime_fees_lamports BIGINT,
  ADD COLUMN lifetime_fees_sol DOUBLE PRECISION,
  ADD COLUMN creator_provider TEXT,
  ADD COLUMN creator_username TEXT,
  ADD COLUMN creator_provider_username TEXT,
  ADD COLUMN creator_wallet TEXT,
  ADD COLUMN creator_pfp TEXT,
  ADD COLUMN creator_royalty_bps INTEGER,
  ADD COLUMN bags_synced_at TIMESTAMPTZ,
  ADD COLUMN bags_sync_error TEXT;

CREATE INDEX idx_bagimons_bags_sync
  ON bagimons(bags_synced_at NULLS FIRST);
