import { describe, it, expect } from 'vitest';
import type { BagimonSupabaseClient } from '@bagimon/db';
import { fetchBagimonForPetdexWith } from './fetch-bagimon';

const SAMPLE_BAGIMON = {
  id: '11111111-2222-3333-4444-555555555555',
  discord_server_id: 'srv',
  discord_server_name: null,
  coin_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  coin_symbol: 'WIF',
  coin_name: 'Wifhat',
  current_mood: 'happy',
  is_alive: true,
  born_at: '2026-05-02T00:00:00Z',
  died_at: null,
  last_activity_at: '2026-05-19T00:00:00Z',
  spawned_by_discord_user_id: 'u',
  created_at: '2026-05-02T00:00:00Z',
  updated_at: '2026-05-19T00:00:00Z',
  last_stats_at: '2026-05-19T11:00:00Z',
  last_price_usd: 0.00214,
  last_volume24h_usd: 348200,
  last_price_change_24h_pct: 12.4,
};

interface QueryBuilder {
  select: () => QueryBuilder;
  eq: () => QueryBuilder;
  order: () => QueryBuilder;
  limit: () => Promise<{ data: unknown; error: null }>;
  maybeSingle: () => Promise<{ data: unknown; error: null }>;
}

function mockClient(responses: {
  bagimon: unknown;
  moods: unknown[];
  interactions: unknown[];
}): BagimonSupabaseClient {
  const from = (table: string): QueryBuilder => {
    const builder: QueryBuilder = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: async () =>
        table === 'mood_transitions'
          ? { data: responses.moods, error: null }
          : { data: responses.interactions, error: null },
      maybeSingle: async () => ({ data: responses.bagimon, error: null }),
    };
    return builder;
  };
  // The supabase client surface is wide; we cast our minimal mock through unknown.
  return { from } as unknown as BagimonSupabaseClient;
}

describe('fetchBagimonForPetdexWith', () => {
  it('returns null when the bagimon does not exist', async () => {
    const client = mockClient({ bagimon: null, moods: [], interactions: [] });
    const result = await fetchBagimonForPetdexWith(client, 'missing');
    expect(result).toBeNull();
  });

  it('shapes a full payload', async () => {
    const client = mockClient({
      bagimon: SAMPLE_BAGIMON,
      moods: [
        {
          id: 'm1',
          bagimon_id: SAMPLE_BAGIMON.id,
          from_mood: null,
          to_mood: 'happy',
          trigger_reason: 'spawn',
          created_at: '2026-05-02T00:00:00Z',
        },
      ],
      interactions: [
        {
          id: 'i1',
          bagimon_id: SAMPLE_BAGIMON.id,
          petter_discord_user_id: 'u1',
          petter_discord_display_name: 'lila',
          response_text: 'wiggle wiggle',
          source: 'haiku',
          created_at: '2026-05-19T11:30:00Z',
        },
      ],
    });
    const result = await fetchBagimonForPetdexWith(client, SAMPLE_BAGIMON.id);
    expect(result).not.toBeNull();
    expect(result!.bagimon.coinSymbol).toBe('WIF');
    expect(result!.bagimon.currentMood).toBe('happy');
    expect(result!.bagimon.petdexNumber).toMatch(/^№ \d{4}$/);
    expect(result!.bagimon.speciesDisplayName).toMatch(/Ghotosai|Potatiki/);
    expect(result!.bagimon.speciesType).toMatch(/\//);
    expect(result!.moodHistory).toHaveLength(1);
    expect(result!.interactions[0]!.petterDisplayName).toBe('lila');
    expect(result!.bagimon.isAlive).toBe(true);
    expect(result!.bagimon.diedAt).toBeNull();
  });

  it('exposes memorial fields when the bagimon is dead', async () => {
    const dead = {
      ...SAMPLE_BAGIMON,
      is_alive: false,
      died_at: '2026-05-18T00:00:00Z',
      final_mood: 'dying',
      final_price_usd: 0.0001,
      final_volume24h_usd: 42,
    };
    const client = mockClient({ bagimon: dead, moods: [], interactions: [] });
    const result = await fetchBagimonForPetdexWith(client, SAMPLE_BAGIMON.id);
    expect(result).not.toBeNull();
    expect(result!.bagimon.isAlive).toBe(false);
    expect(result!.bagimon.diedAt).toBeInstanceOf(Date);
    expect(result!.bagimon.finalMood).toBe('dying');
    expect(result!.bagimon.finalVolume24hUsd).toBe(42);
    expect(result!.bagimon.lifespanDays).toBeGreaterThan(0);
  });
});
