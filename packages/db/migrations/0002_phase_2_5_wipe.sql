-- Phase 2.5: trait model changed from parts-based to species-based.
-- Existing Bagimons no longer have valid trait derivations under the new system.
-- Safe to wipe since only test data exists at this point.
truncate table bagimons cascade;
