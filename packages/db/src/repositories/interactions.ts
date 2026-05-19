import type { BagimonSupabaseClient } from '../client.js';
import type { Interaction } from '../types.js';

export interface RecordInteractionInput {
  bagimonId: string;
  petterDiscordUserId: string;
  petterDisplayName: string;
  responseText: string;
  source: 'haiku' | 'fallback';
}

export class InteractionsRepository {
  constructor(private readonly client: BagimonSupabaseClient) {}

  async record(input: RecordInteractionInput): Promise<void> {
    const { error } = await this.client.from('interactions').insert({
      bagimon_id: input.bagimonId,
      petter_discord_user_id: input.petterDiscordUserId,
      petter_discord_display_name: input.petterDisplayName,
      response_text: input.responseText,
      source: input.source,
    });
    if (error) throw new Error(`failed to record interaction: ${error.message}`);
  }

  async getRecent(bagimonId: string, limit = 3): Promise<Interaction[]> {
    const { data, error } = await this.client
      .from('interactions')
      .select()
      .eq('bagimon_id', bagimonId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(`failed to load recent interactions: ${error.message}`);
    return data ?? [];
  }
}
