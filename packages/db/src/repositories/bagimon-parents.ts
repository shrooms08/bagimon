import type { BagimonSupabaseClient } from '../client.js';
import type { BagimonParent } from '../types.js';

export interface SnapshotHolder {
  walletAddress: string;
  holdingAmount: number;
  holdingPercentOfSupply?: number | null;
}

export interface SnapshotParentsInput {
  bagimonId: string;
  holders: SnapshotHolder[]; // already ranked: holders[0] = rank 1
  snapshotAt: Date;
}

export class BagimonParentsRepository {
  constructor(private readonly client: BagimonSupabaseClient) {}

  // Inserts one row per holder (rank = index+1), all sharing snapshot_at.
  // A single INSERT — either all rows land or none do.
  // Idempotency note: calling twice with the same snapshotAt will insert
  // duplicate rows. We treat each call as a NEW snapshot; the worker is
  // responsible for not double-running on the same Bagimon in one tick.
  async snapshotParents(input: SnapshotParentsInput): Promise<void> {
    if (input.holders.length === 0) return;
    const snapshotIso = input.snapshotAt.toISOString();
    const rows = input.holders.map((h, i) => ({
      bagimon_id: input.bagimonId,
      wallet_address: h.walletAddress,
      rank: i + 1,
      holding_amount: h.holdingAmount,
      holding_percent_of_supply: h.holdingPercentOfSupply ?? null,
      snapshot_at: snapshotIso,
    }));
    const { error } = await this.client.from('bagimon_parents').insert(rows);
    if (error) throw new Error(`snapshotParents failed: ${error.message}`);
  }

  // Returns the rows from the most recent snapshot for this Bagimon,
  // ordered by rank ascending. Uses (bagimon_id, snapshot_at desc) index.
  async getLatestParents(bagimonId: string): Promise<BagimonParent[]> {
    const { data: latest, error: latestErr } = await this.client
      .from('bagimon_parents')
      .select()
      .eq('bagimon_id', bagimonId)
      .order('snapshot_at', { ascending: false })
      .limit(1);
    if (latestErr) throw new Error(`getLatestParents failed: ${latestErr.message}`);
    const latestAt = latest?.[0]?.snapshot_at;
    if (!latestAt) return [];

    const { data, error } = await this.client
      .from('bagimon_parents')
      .select()
      .eq('bagimon_id', bagimonId)
      .eq('snapshot_at', latestAt)
      .order('rank', { ascending: true });
    if (error) throw new Error(`getLatestParents fetch failed: ${error.message}`);
    return data ?? [];
  }
}
