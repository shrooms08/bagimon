import type { Bagimon, BagimonParentsRepository, BagimonRepository } from '@bagimon/db';
import type { HolderDataService } from '@bagimon/holder-data';

export interface ParentSnapshotSummary {
  snapshotted: number;
  failed: number;
  skipped: number;
  durationMs: number;
}

export interface ParentSnapshotOptions {
  // Default: 3. Helius free-tier rate limits make higher values risky.
  concurrency?: number;
  // Holders below this count are skipped (degenerate cases).
  minHolders?: number;
  now?: () => number;
}

const DEFAULT_CONCURRENCY = 3;
const DEFAULT_MIN_HOLDERS = 2;

export class ParentSnapshotWorker {
  private readonly concurrency: number;
  private readonly minHolders: number;
  private readonly now: () => number;

  constructor(
    private readonly repo: BagimonRepository,
    private readonly parentRepo: BagimonParentsRepository,
    private readonly holderService: HolderDataService,
    options: ParentSnapshotOptions = {},
  ) {
    this.concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);
    this.minHolders = options.minHolders ?? DEFAULT_MIN_HOLDERS;
    this.now = options.now ?? (() => Date.now());
  }

  async runOnce(): Promise<ParentSnapshotSummary> {
    const startedAt = this.now();
    const alive = await this.repo.findAllAlive();

    let snapshotted = 0;
    let failed = 0;
    let skipped = 0;

    const queue = [...alive];
    const workers: Promise<void>[] = [];
    const workerCount = Math.min(this.concurrency, queue.length);
    for (let i = 0; i < workerCount; i += 1) {
      workers.push(
        (async () => {
          while (queue.length > 0) {
            const next = queue.shift();
            if (!next) break;
            const outcome = await this.snapshotOne(next);
            if (outcome === 'snapshotted') snapshotted += 1;
            else if (outcome === 'failed') failed += 1;
            else skipped += 1;
          }
        })(),
      );
    }
    await Promise.all(workers);

    return { snapshotted, failed, skipped, durationMs: this.now() - startedAt };
  }

  private async snapshotOne(
    b: Bagimon,
  ): Promise<'snapshotted' | 'skipped' | 'failed'> {
    const label = b.coin_symbol ? `$${b.coin_symbol}` : b.coin_mint.slice(0, 8);
    try {
      const holders = await this.holderService.getTopHolders(b.coin_mint, 10);
      if (holders.length < this.minHolders) {
        console.info(
          `[ParentSnapshot] ⚠️  ${label}: only ${holders.length} holders found, skipping`,
        );
        return 'skipped';
      }
      await this.parentRepo.snapshotParents({
        bagimonId: b.id,
        holders: holders.map((h) => ({
          walletAddress: h.walletAddress,
          holdingAmount: h.holdingAmount,
          holdingPercentOfSupply: h.holdingPercentOfSupply,
        })),
        snapshotAt: new Date(this.now()),
      });
      console.info(
        `[ParentSnapshot] 👨‍👩‍👧 ${label}: ${holders.length} parents snapshotted`,
      );
      return 'snapshotted';
    } catch (err) {
      console.warn(
        `[ParentSnapshot] ${label} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return 'failed';
    }
  }
}
