import { describe, it, expect } from 'vitest';
import type { BagimonSupabaseClient } from '@bagimon/db';
import { fetchLiveBagimonsForHomepageWith } from './fetch-homepage';

const SAMPLE = {
  id: '11111111-2222-3333-4444-555555555555',
  coin_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  coin_symbol: 'WIF',
  coin_name: 'Wifhat',
  current_mood: 'happy',
  is_alive: true,
  born_at: '2026-05-02T00:00:00Z',
  created_at: '2026-05-02T00:00:00Z',
};

interface QB {
  select: () => QB;
  eq: () => QB;
  order: () => QB;
  limit: () => Promise<{ data: unknown; error: null }>;
}

function mockClient(rows: unknown[]): BagimonSupabaseClient {
  const from = (): QB => {
    const builder: QB = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: async () => ({ data: rows, error: null }),
    };
    return builder;
  };
  return { from } as unknown as BagimonSupabaseClient;
}

describe('fetchLiveBagimonsForHomepageWith', () => {
  it('returns [] when no alive bagimons', async () => {
    const result = await fetchLiveBagimonsForHomepageWith(mockClient([]));
    expect(result).toEqual([]);
  });

  it('shapes alive bagimons with derived species', async () => {
    const result = await fetchLiveBagimonsForHomepageWith(mockClient([SAMPLE]));
    expect(result).toHaveLength(1);
    expect(result[0]!.coinSymbol).toBe('WIF');
    expect(result[0]!.currentMood).toBe('happy');
    expect(result[0]!.speciesDisplayName).toMatch(/Ghotosai|Potatiki/);
  });
});
