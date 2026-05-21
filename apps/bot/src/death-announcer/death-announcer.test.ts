import { describe, expect, it, vi } from 'vitest';
import { DeathAnnouncer } from './index.js';
import type { Bagimon, BagimonRepository } from '@bagimon/db';

function makeDead(overrides: Partial<Bagimon> = {}): Bagimon {
  const bornAt = new Date(Date.now() - 14 * 86_400_000).toISOString();
  return {
    id: 'bg-1',
    discord_server_id: 'srv-1',
    discord_server_name: 'srv',
    coin_mint: '11111111111111111111111111111111',
    coin_symbol: 'WIF',
    coin_name: 'dogwifhat',
    current_mood: 'dying',
    is_alive: false,
    born_at: bornAt,
    died_at: new Date().toISOString(),
    last_activity_at: bornAt,
    spawned_by_discord_user_id: 'u',
    created_at: bornAt,
    updated_at: bornAt,
    last_stats_at: null,
    last_price_usd: null,
    last_volume24h_usd: null,
    last_price_change_24h_pct: null,
    death_announced: false,
    final_mood: 'dying',
    final_price_usd: 0.0001,
    final_volume24h_usd: 42,
    lifetime_fees_lamports: null,
    lifetime_fees_sol: null,
    creator_provider: null,
    creator_username: null,
    creator_provider_username: null,
    creator_wallet: null,
    creator_pfp: null,
    creator_royalty_bps: null,
    bags_synced_at: null,
    bags_sync_error: null,
    ...overrides,
  };
}

function makeMockClient(opts: { send?: ReturnType<typeof vi.fn>; throwOnFetch?: boolean } = {}) {
  const send = opts.send ?? vi.fn(async () => undefined);
  const channel = {
    type: 0, // ChannelType.GuildText
    send,
    permissionsFor: () => ({ has: () => true }),
  };
  const guild = {
    members: { me: {} },
    systemChannel: channel,
    channels: { fetch: async () => new Map([['c1', channel]]) },
  };
  return {
    send,
    client: {
      guilds: {
        fetch: async () => {
          if (opts.throwOnFetch) throw new Error('not in guild');
          return guild;
        },
      },
    } as never,
  };
}

describe('DeathAnnouncer.runOnce', () => {
  it('posts a death embed to the system channel and marks announced', async () => {
    const dead = makeDead();
    const repo = {
      findUnannouncedDeaths: vi.fn(async () => [dead]),
      markDeathAnnounced: vi.fn(async () => undefined),
    } as unknown as BagimonRepository;
    const { client, send } = makeMockClient();
    const announcer = new DeathAnnouncer(client, repo);
    const summary = await announcer.runOnce();
    expect(summary.announced).toBe(1);
    expect(send).toHaveBeenCalledOnce();
    expect(repo.markDeathAnnounced).toHaveBeenCalledWith('bg-1');
  });

  it('still marks announced when posting fails (no retry spam)', async () => {
    const dead = makeDead();
    const repo = {
      findUnannouncedDeaths: vi.fn(async () => [dead]),
      markDeathAnnounced: vi.fn(async () => undefined),
    } as unknown as BagimonRepository;
    const { client } = makeMockClient({ throwOnFetch: true });
    const announcer = new DeathAnnouncer(client, repo);
    const summary = await announcer.runOnce();
    expect(summary.failed).toBe(1);
    expect(summary.announced).toBe(0);
    expect(repo.markDeathAnnounced).toHaveBeenCalledWith('bg-1');
  });

  it('is idempotent: empty unannounced list does nothing', async () => {
    const repo = {
      findUnannouncedDeaths: vi.fn(async () => []),
      markDeathAnnounced: vi.fn(async () => undefined),
    } as unknown as BagimonRepository;
    const { client, send } = makeMockClient();
    const announcer = new DeathAnnouncer(client, repo);
    const summary = await announcer.runOnce();
    expect(summary.announced).toBe(0);
    expect(send).not.toHaveBeenCalled();
    expect(repo.markDeathAnnounced).not.toHaveBeenCalled();
  });
});
