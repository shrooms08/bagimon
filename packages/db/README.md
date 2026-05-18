# @bagimon/db

Supabase client, hand-written DB types, and the repositories that every other
package uses to talk to Postgres. **Never instantiate a Supabase client outside
this package** — import `createServerClient` / `createPublicClient` and a
repository instead.

## Applying migrations

We don't ship a migration tool in v1 (overkill for a single Postgres). Apply
migrations manually:

1. Open the Supabase dashboard for the project.
2. SQL Editor → New query.
3. Paste the contents of the next un-applied file in `migrations/`
   (e.g. `0001_initial.sql`).
4. Run. Confirm `bagimons`, `mood_transitions`, `bagimon_parents` exist under
   Table Editor.

Migrations are ordered by filename. When adding one, bump the numeric prefix
(`0002_…`, `0003_…`) and never edit a previously-applied file in place.

### Phase 2.5 wipe

`0002_phase_2_5_wipe.sql` truncates `bagimons` (cascading mood_transitions and
bagimon_parents). The Phase 2.5 refactor changed trait derivation from parts
(body/eyes/mouth) to species, so pre-2.5 rows would render as the wrong creature.
Run this migration manually in the Supabase SQL editor before redeploying the bot:

```sql
truncate table bagimons cascade;
```

## Repositories

- `BagimonRepository` — spawn, lookup, mood update (with transition log),
  activity touch.

Add a repository per aggregate. Keep query logic out of `apps/bot` and
`apps/web` command/route handlers.

## Tests

```
pnpm --filter @bagimon/db test
```

Tests use a hand-rolled fake of the Supabase client — no real DB connection.
