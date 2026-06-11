import { describe, expect, it, vi } from 'vitest';
import { handleFamily } from './family.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type {
  BagimonParentsRepository,
  BagimonRepository,
  Bagimon,
  BagimonParent,
} from '@bagimon/db';

function makeBagimon(overrides: Partial<Bagimon> = {}): Bagimon {
  const now = new Date().toISOString();
  return {
    id: 'bg-1',
    discord_server_id: 'srv-1',
    discord_server_name: null,
    coin_mint: '11111111111111111111111111111111',
    coin_symbol: 'WIF',
    coin_name: null,
    current_mood: 'happy',
    is_alive: true,
    born_at: now,
    died_at: null,
    last_activity_at: now,
    spawned_by_discord_user_id: 'u',
    created_at: now,
    updated_at: now,
    last_stats_at: null,
    last_price_usd: null,
    last_volume24h_usd: null,
    last_price_change_24h_pct: null,
    death_announced: false,
    final_mood: null,
    final_price_usd: null,
    final_volume24h_usd: null,
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
    times_fed: 0,
    times_pet: 0,
    last_fed_at: null,
    last_fed_by: null,
    last_interaction_at: null,
    created_via: 'discord',
    owner_wallet: null,
    claimed_at: null,
    ...overrides,
  };
}

function makeParent(rank: number, wallet: string, amount: number): BagimonParent {
  return {
    id: `p${rank}`,
    bagimon_id: 'bg-1',
    wallet_address: wallet,
    rank,
    holding_amount: amount,
    holding_percent_of_supply: 10,
    snapshot_at: new Date().toISOString(),
    first_became_parent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function makeInteraction(opts: { mint?: string | null } = {}) {
  const reply = vi.fn(async (_payload?: unknown) => undefined);
  return {
    interaction: {
      guildId: 'srv-1',
      options: { getString: (_: string) => opts.mint ?? null },
      reply,
    } as unknown as ChatInputCommandInteraction,
    reply,
  };
}

function makeRepo(bagimons: Bagimon[]): BagimonRepository {
  return {
    findByServerAndMint: vi.fn(async (_s: string, m: string) =>
      bagimons.find((b) => b.coin_mint === m) ?? null,
    ),
    findByServer: vi.fn(async () => bagimons),
  } as unknown as BagimonRepository;
}

describe('handleFamily', () => {
  it('replies with embed listing 10 parents', async () => {
    const repo = makeRepo([makeBagimon()]);
    const parents = Array.from({ length: 10 }, (_, i) =>
      makeParent(i + 1, `wallet${i + 1}xxxxxx`, 1000 - i * 50),
    );
    const parentRepo = {
      getLatestParents: vi.fn(async () => parents),
    } as unknown as BagimonParentsRepository;
    const { interaction, reply } = makeInteraction();
    await handleFamily(interaction, repo, parentRepo);
    expect(reply).toHaveBeenCalledOnce();
    const call = (reply.mock.calls[0]?.[0] as unknown) as { embeds: Array<{ data: { fields: unknown[] } }> };
    expect(call.embeds).toBeDefined();
    expect(call.embeds[0]?.data.fields).toHaveLength(10);
  });

  it('shows "no snapshot yet" message when there are no parents', async () => {
    const repo = makeRepo([makeBagimon()]);
    const parentRepo = {
      getLatestParents: vi.fn(async () => []),
    } as unknown as BagimonParentsRepository;
    const { interaction, reply } = makeInteraction();
    await handleFamily(interaction, repo, parentRepo);
    const call = (reply.mock.calls[0]?.[0] as unknown) as { content?: string };
    expect(call.content).toMatch(/No parent snapshots/i);
  });

  it('returns an ephemeral memorial reply when bagimon is dead', async () => {
    const dead = makeBagimon({ is_alive: false, died_at: new Date().toISOString(), final_mood: 'dying' });
    const repo = makeRepo([dead]);
    const parentRepo = {
      getLatestParents: vi.fn(async () => []),
    } as unknown as BagimonParentsRepository;
    const { interaction, reply } = makeInteraction();
    await handleFamily(interaction, repo, parentRepo);
    expect(parentRepo.getLatestParents).not.toHaveBeenCalled();
    const call = (reply.mock.calls[0]?.[0] as unknown) as { ephemeral?: boolean };
    expect(call.ephemeral).toBe(true);
  });

  it('reports none when server has no bagimons', async () => {
    const repo = makeRepo([]);
    const parentRepo = {
      getLatestParents: vi.fn(),
    } as unknown as BagimonParentsRepository;
    const { interaction, reply } = makeInteraction();
    await handleFamily(interaction, repo, parentRepo);
    const call = (reply.mock.calls[0]?.[0] as unknown) as { ephemeral?: boolean; content?: string };
    expect(call.ephemeral).toBe(true);
    expect(call.content).toMatch(/No Bagimons/i);
  });
});
