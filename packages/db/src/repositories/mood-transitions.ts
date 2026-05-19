import type { BagimonSupabaseClient } from '../client.js';
import type { MoodTransition } from '../types.js';

export class MoodTransitionsRepository {
  constructor(private readonly client: BagimonSupabaseClient) {}

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
