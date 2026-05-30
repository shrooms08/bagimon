import type { BagimonSupabaseClient } from '../client.js';
import type { Interaction, InteractionAction } from '../types.js';

export interface RecordInteractionInput {
  bagimonId: string;
  petterDiscordUserId: string;
  petterDisplayName: string;
  responseText: string;
  source: 'haiku' | 'fallback';
}

export interface RecordWebInteractionInput {
  bagimonId: string;
  actorWallet: string;
  action: InteractionAction;
  responseText: string;
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
      channel: 'discord',
      action_type: 'pet',
    });
    if (error) throw new Error(`failed to record interaction: ${error.message}`);
  }

  // Web feed/pet from a verified holder. The wallet is the actor; there is no
  // Discord identity. Static response text (no AI), so source is 'fallback'.
  async recordWeb(input: RecordWebInteractionInput): Promise<void> {
    const { error } = await this.client.from('interactions').insert({
      bagimon_id: input.bagimonId,
      response_text: input.responseText,
      source: 'fallback',
      channel: 'web',
      actor_wallet: input.actorWallet,
      action_type: input.action,
    });
    if (error) throw new Error(`failed to record web interaction: ${error.message}`);
  }

  // Cooldown check: the most recent timestamp this wallet performed this action
  // on this bagimon, or null if never. Callers compare against a window.
  async lastWebActionAt(
    bagimonId: string,
    actorWallet: string,
    action: InteractionAction,
  ): Promise<Date | null> {
    const { data, error } = await this.client
      .from('interactions')
      .select('created_at')
      .eq('bagimon_id', bagimonId)
      .eq('actor_wallet', actorWallet)
      .eq('action_type', action)
      .eq('channel', 'web')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`failed to read cooldown: ${error.message}`);
    return data?.created_at ? new Date(data.created_at) : null;
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
