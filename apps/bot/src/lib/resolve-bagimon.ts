import type { Bagimon, BagimonRepository } from '@bagimon/db';

export type ResolveResult =
  | { kind: 'found'; bagimon: Bagimon }
  | { kind: 'none' }
  | { kind: 'ambiguous'; bagimons: Bagimon[] }
  | { kind: 'not-in-server' };

// When a slash command takes an optional `mint`, resolve which Bagimon the
// user means:
//   - explicit mint → look it up directly
//   - no mint, server has exactly one → use it
//   - no mint, server has many → ambiguous; caller prompts
//   - no mint, server has none → none
export async function resolveBagimon(
  repo: BagimonRepository,
  serverId: string,
  mint: string | null,
): Promise<ResolveResult> {
  if (mint) {
    const found = await repo.findByServerAndMint(serverId, mint);
    return found ? { kind: 'found', bagimon: found } : { kind: 'none' };
  }
  const all = await repo.findByServer(serverId);
  if (all.length === 0) return { kind: 'none' };
  if (all.length === 1) {
    const only = all[0]!;
    return { kind: 'found', bagimon: only };
  }
  return { kind: 'ambiguous', bagimons: all };
}
