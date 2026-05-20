import type { BagimonSupabaseClient } from '../client.js';
import type { MoodTransition } from '../types.js';

export class MoodTransitionsRepository {
  constructor(private readonly client: BagimonSupabaseClient) {}

  // Dev-only: rewrite created_at on every 'dying' transition row for this
  // bagimon. Used by /bagimon expedite to force a death on the next tick.
  async backdateDyingTransitions(bagimonId: string, when: Date): Promise<void> {
    const { error } = await this.client
      .from('mood_transitions')
      .update({ created_at: when.toISOString() })
      .eq('bagimon_id', bagimonId)
      .eq('to_mood', 'dying');
    if (error) throw new Error(`backdateDyingTransitions failed: ${error.message}`);
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
