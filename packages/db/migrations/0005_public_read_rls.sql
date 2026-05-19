-- Phase 5: enable Row Level Security so the public Petdex web app can read
-- safe data with the anon key, while the bot continues to use the service
-- role key (which bypasses RLS entirely).
--
-- Tables exposed to anon: bagimons, interactions, mood_transitions,
-- bagimon_parents.  ai_calls stays fully locked down — anon gets no
-- policy, so anon reads return 0 rows.

alter table bagimons enable row level security;
alter table interactions enable row level security;
alter table mood_transitions enable row level security;
alter table bagimon_parents enable row level security;
alter table ai_calls enable row level security;

create policy "anon_read_bagimons" on bagimons
  for select to anon using (true);

create policy "anon_read_interactions" on interactions
  for select to anon using (true);

create policy "anon_read_mood_transitions" on mood_transitions
  for select to anon using (true);

create policy "anon_read_bagimon_parents" on bagimon_parents
  for select to anon using (true);

-- ai_calls: no policy → anon cannot read. Service role bypasses RLS.
