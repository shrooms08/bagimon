import type { Mood } from '@bagimon/shared';
import type { BagimonSupabaseClient } from '../client.js';
import type { MoodTransition } from '../types.js';

export class MoodTransitionsRepository {
  constructor(private readonly client: BagimonSupabaseClient) {}

  // Dev-only: clear any recent transitions and insert a single backdated
  // dying row, so continuousDyingDays sees an unambiguous streak. Used by
  // /bagimon expedite to force a death on the next tick regardless of what
  // recent mood loop ticks may have written.
  async expediteDying(input: {
    bagimonId: string;
    fromMood: Mood | null;
    backdatedCreatedAt: Date;
  }): Promise<void> {
    const cutoff = new Date(input.backdatedCreatedAt.getTime() - 60_000);
    const { error: delError } = await this.client
      .from('mood_transitions')
      .delete()
      .eq('bagimon_id', input.bagimonId)
      .gte('created_at', cutoff.toISOString());
    if (delError) throw new Error(`expediteDying delete failed: ${delError.message}`);

    const { error: insError } = await this.client.from('mood_transitions').insert({
      bagimon_id: input.bagimonId,
      from_mood: input.fromMood,
      to_mood: 'dying',
      trigger_reason: 'expedite_dev',
      created_at: input.backdatedCreatedAt.toISOString(),
    });
    if (insError) throw new Error(`expediteDying insert failed: ${insError.message}`);
  }

  async getRecent(bagimonId: string, limit = 3): Promise<MoodTransition[]> {
    const { data, error } = await this.client
      .from('mood_transitions')
      .select()
      .eq('bagimon_id', bagimonId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(`failed to load mood transitions: ${error.message}`);
    return data ?? [];
  }
}
