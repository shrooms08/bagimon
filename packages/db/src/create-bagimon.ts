import {
  validateBagsPool,
  fetchLifetimeFees,
  fetchCreators,
  getPrimaryCreator,
} from '@bagimon/bags-api';
import type { BagimonRepository } from './repositories/bagimons.js';
import type { Bagimon, BagimonCreatedVia } from './types.js';

// Thrown when a mint is confirmed NOT to be a Bags.fm coin. Callers map this to
// a friendly rejection. Only thrown when BAGS_API_KEY is set (otherwise pool
// validation is skipped, preserving the bot's pre-7.6 behavior).
export class NotABagsCoinError extends Error {
  constructor(public readonly mint: string) {
    super(`not a Bags coin: ${mint}`);
    this.name = 'NotABagsCoinError';
  }
}

export interface CreateBagimonOptions {
  discordServerId?: string | null;
  discordServerName?: string | null;
  spawnedByDiscordUserId?: string | null;
  createdVia?: BagimonCreatedVia;
}

// The single source of truth for spawning a Bagimon, shared by the Discord
// `/bagimon spawn` command and the web spawn route. Validates the Bags pool
// (when a key is present), eagerly syncs Bags fee + creator data so the first
// Petdex view and mood tick aren't empty, inserts the row, and returns it.
//
// Identity (species/accessory) is NOT chosen here — it's derived deterministically
// from the mint at render time. The mint is the seed.
export async function createBagimon(
  repo: BagimonRepository,
  coinMint: string,
  opts: CreateBagimonOptions = {},
): Promise<Bagimon> {
  if (process.env.BAGS_API_KEY) {
    const isBagsCoin = await validateBagsPool(coinMint);
    if (!isBagsCoin) throw new NotABagsCoinError(coinMint);
  }

  const [feesResult, creatorsResult] = await Promise.all([
    fetchLifetimeFees(coinMint),
    fetchCreators(coinMint),
  ]);
  const primaryCreator = creatorsResult ? getPrimaryCreator(creatorsResult) : null;

  const bagimon = await repo.spawn({
    coin_mint: coinMint,
    discord_server_id: opts.discordServerId ?? null,
    discord_server_name: opts.discordServerName ?? null,
    spawned_by_discord_user_id: opts.spawnedByDiscordUserId ?? null,
    created_via: opts.createdVia ?? 'discord',
  });

  await repo.updateBagsData(bagimon.id, {
    lifetimeFeesLamports: feesResult?.lamports ?? null,
    lifetimeFeesSol: feesResult?.sol ?? null,
    creator: primaryCreator
      ? {
          provider: primaryCreator.provider ?? null,
          username: primaryCreator.username ?? null,
          providerUsername: primaryCreator.providerUsername ?? null,
          wallet: primaryCreator.wallet ?? null,
          pfp: primaryCreator.pfp ?? null,
          royaltyBps: primaryCreator.royaltyBps ?? null,
        }
      : null,
    error: null,
  });

  return bagimon;
}
