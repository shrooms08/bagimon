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

  async findAllAlive(): Promise<Bagimon[]> {
    const { data, error } = await this.client
      .from('bagimons')
      .select()
      .eq('is_alive', true);
    if (error) throw new Error(`findAllAlive failed: ${error.message}`);
    return data ?? [];
  }

  async updateStats(
    id: string,
    stats: Partial<
      Pick<
        Bagimon,
        | 'coin_symbol'
        | 'coin_name'
        | 'last_stats_at'
        | 'last_price_usd'
        | 'last_volume24h_usd'
        | 'last_price_change_24h_pct'
      >
    >,
  ): Promise<void> {
    const { error } = await this.client
      .from('bagimons')
      .update({ ...stats, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`updateStats failed: ${error.message}`);
  }

  async findUnannouncedDeaths(): Promise<Bagimon[]> {
    const { data, error } = await this.client
      .from('bagimons')
      .select()
      .eq('is_alive', false)
      .eq('death_announced', false);
    if (error) throw new Error(`findUnannouncedDeaths failed: ${error.message}`);
    return data ?? [];
  }

  async markDead(
    id: string,
    finals: { mood: Mood; priceUsd: number | null; volume24hUsd: number | null },
  ): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.client
      .from('bagimons')
      .update({
        is_alive: false,
        died_at: now,
        final_mood: finals.mood,
        final_price_usd: finals.priceUsd,
        final_volume24h_usd: finals.volume24hUsd,
        updated_at: now,
      })
      .eq('id', id)
      .eq('is_alive', true);
    if (error) throw new Error(`markDead failed: ${error.message}`);
  }

  async markDeathAnnounced(id: string): Promise<void> {
    const { error } = await this.client
      .from('bagimons')
      .update({ death_announced: true, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`markDeathAnnounced failed: ${error.message}`);
  }

  async updateBagsData(
    id: string,
    data: {
      lifetimeFeesLamports: number | null;
      lifetimeFeesSol: number | null;
      creator: {
        provider: string | null;
        username: string | null;
        providerUsername: string | null;
        wallet: string | null;
        pfp: string | null;
        royaltyBps: number | null;
      } | null;
      error: string | null;
    },
  ): Promise<void> {
    const { error } = await this.client
      .from('bagimons')
      .update({
        lifetime_fees_lamports: data.lifetimeFeesLamports,
        lifetime_fees_sol: data.lifetimeFeesSol,
        creator_provider: data.creator?.provider ?? null,
        creator_username: data.creator?.username ?? null,
        creator_provider_username: data.creator?.providerUsername ?? null,
        creator_wallet: data.creator?.wallet ?? null,
        creator_pfp: data.creator?.pfp ?? null,
        creator_royalty_bps: data.creator?.royaltyBps ?? null,
        bags_synced_at: new Date().toISOString(),
        bags_sync_error: data.error,
      })
      .eq('id', id);
    if (error) throw new Error(`updateBagsData failed: ${error.message}`);
  }

  async touchActivity(id: string): Promise<void> {
    const { error } = await this.client
      .from('bagimons')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`touchActivity failed: ${error.message}`);
  }

  // Apply a verified web interaction's cosmetic effect: bump the relevant
  // counter and last-interaction timestamp. Feed also records who/when last fed.
  // NOTE: read-modify-write (no atomic SQL increment to avoid an RPC migration).
  // Per-wallet cooldowns make concurrent writes on one bagimon rare; a lost
  // increment under contention is acceptable for a cosmetic counter.
  // This deliberately does NOT touch the on-chain death clock — feeding is an
  // engagement signal only (see CLAUDE.md §8 death mechanic).
  async applyInteraction(
    id: string,
    action: 'pet' | 'feed',
    actorWallet: string,
  ): Promise<{ times_fed: number; times_pet: number }> {
    const current = await this.findById(id);
    if (!current) throw new Error(`bagimon ${id} not found`);
    const now = new Date().toISOString();
    const next = {
      times_fed: current.times_fed + (action === 'feed' ? 1 : 0),
      times_pet: current.times_pet + (action === 'pet' ? 1 : 0),
    };
    const update: Partial<Bagimon> = {
      ...next,
      last_interaction_at: now,
      updated_at: now,
    };
    if (action === 'feed') {
      update.last_fed_at = now;
      update.last_fed_by = actorWallet;
    }
    const { error } = await this.client.from('bagimons').update(update).eq('id', id);
    if (error) throw new Error(`applyInteraction failed: ${error.message}`);
    return next;
  }
}
