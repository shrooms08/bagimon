import type { Mood } from '@bagimon/shared';
import type { BagimonSupabaseClient } from '../client.js';
import type { Bagimon, BagimonInsert } from '../types.js';

export interface SpawnBagimonInput {
  discord_server_id: string;
  discord_server_name?: string | null;
  coin_mint: string;
  spawned_by_discord_user_id: string;
  coin_symbol?: string | null;
  coin_name?: string | null;
}

export class BagimonRepository {
  constructor(private readonly client: BagimonSupabaseClient) {}

  async spawn(input: SpawnBagimonInput): Promise<Bagimon> {
    const insert: BagimonInsert = {
      discord_server_id: input.discord_server_id,
      discord_server_name: input.discord_server_name ?? null,
      coin_mint: input.coin_mint,
      coin_symbol: input.coin_symbol ?? null,
      coin_name: input.coin_name ?? null,
      spawned_by_discord_user_id: input.spawned_by_discord_user_id,
      current_mood: 'happy',
    };

    const { data, error } = await this.client
      .from('bagimons')
      .insert(insert)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error(
          `bagimon already exists for server ${input.discord_server_id} and mint ${input.coin_mint}`,
        );
      }
      throw new Error(`failed to spawn bagimon: ${error.message}`);
    }
    if (!data) {
      throw new Error('spawn returned no data');
    }

    const { error: transitionError } = await this.client.from('mood_transitions').insert({
      bagimon_id: data.id,
      from_mood: null,
      to_mood: 'happy',
      trigger_reason: 'spawn',
    });
    if (transitionError) {
      throw new Error(`failed to log spawn transition: ${transitionError.message}`);
    }

    return data;
  }

  async findByServerAndMint(serverId: string, mint: string): Promise<Bagimon | null> {
    const { data, error } = await this.client
      .from('bagimons')
      .select()
      .eq('discord_server_id', serverId)
      .eq('coin_mint', mint)
      .maybeSingle();
    if (error) throw new Error(`findByServerAndMint failed: ${error.message}`);
    return data;
  }

  async findByServer(serverId: string): Promise<Bagimon[]> {
    const { data, error } = await this.client
      .from('bagimons')
      .select()
      .eq('discord_server_id', serverId)
      .order('born_at', { ascending: true });
    if (error) throw new Error(`findByServer failed: ${error.message}`);
    return data ?? [];
  }

  async findById(id: string): Promise<Bagimon | null> {
    const { data, error } = await this.client
      .from('bagimons')
      .select()
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`findById failed: ${error.message}`);
    return data;
  }

  async updateMood(id: string, mood: Mood, reason: string): Promise<Bagimon> {
    const current = await this.findById(id);
    if (!current) throw new Error(`bagimon ${id} not found`);

    const { data, error } = await this.client
      .from('bagimons')
      .update({ current_mood: mood, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`updateMood failed: ${error.message}`);
    if (!data) throw new Error('updateMood returned no data');

    const { error: transitionError } = await this.client.from('mood_transitions').insert({
      bagimon_id: id,
      from_mood: current.current_mood,
      to_mood: mood,
      trigger_reason: reason,
    });
    if (transitionError) {
      throw new Error(`failed to log mood transition: ${transitionError.message}`);
    }

    return data;
  }

  async touchActivity(id: string): Promise<void> {
    const { error } = await this.client
      .from('bagimons')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`touchActivity failed: ${error.message}`);
  }
}
