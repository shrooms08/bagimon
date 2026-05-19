import type { BagimonRepository, Bagimon } from '@bagimon/db';
import type { CoinStatsService, CoinStats } from '@bagimon/coin-data';
import { computeMood, type Mood } from '@bagimon/shared';

export interface RunSummary {
  evaluated: number;
  moodChanged: number;
  failed: number;
  durationMs: number;
}

export interface MoodLoopOptions {
  intervalMs?: number;
  concurrency?: number;
  // Allows tests to override the wall clock.
  now?: () => number;
}

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000;
const DEFAULT_CONCURRENCY = 5;

export class MoodLoop {
  private timer: NodeJS.Timeout | null = null;
  private readonly intervalMs: number;
  private readonly concurrency: number;
  private readonly now: () => number;

  constructor(
    private readonly repo: BagimonRepository,
    private readonly coinStats: CoinStatsService,
    options: MoodLoopOptions = {},
  ) {
    this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);
    this.now = options.now ?? (() => Date.now());
  }

  start(): void {
    if (this.timer) return;
    void this.tickSafe();
    this.timer = setInterval(() => void this.tickSafe(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tickSafe(): Promise<void> {
    try {
      const summary = await this.runOnce();
      console.info(
        `[MoodLoop] tick complete: evaluated=${summary.evaluated} moodChanged=${summary.moodChanged} failed=${summary.failed} duration=${(summary.durationMs / 1000).toFixed(1)}s`,
      );
    } catch (err) {
      console.error('[MoodLoop] tick failed:', err);
    }
  }

  async runOnce(filterMint?: string): Promise<RunSummary> {
    const startedAt = this.now();
    const all = await this.repo.findAllAlive();
    const bagimons = filterMint ? all.filter((b) => b.coin_mint === filterMint) : all;

    let evaluated = 0;
    let moodChanged = 0;
    let failed = 0;

    const queue = [...bagimons];
    const workers: Promise<void>[] = [];
    const workerCount = Math.min(this.concurrency, queue.length);
    for (let i = 0; i < workerCount; i += 1) {
      workers.push(
        (async () => {
          while (queue.length > 0) {
            const next = queue.shift();
            if (!next) break;
            const outcome = await this.evaluateOne(next);
            evaluated += 1;
            if (outcome === 'changed') moodChanged += 1;
            if (outcome === 'failed') failed += 1;
          }
        })(),
      );
    }
    await Promise.all(workers);

    return { evaluated, moodChanged, failed, durationMs: this.now() - startedAt };
  }

  private async evaluateOne(b: Bagimon): Promise<'changed' | 'unchanged' | 'failed'> {
    let stats: CoinStats;
    try {
      stats = await this.coinStats.getStats(b.coin_mint);
    } catch (err) {
      console.warn(
        `[MoodLoop] coin-data failed for ${b.coin_mint}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return 'failed';
    }

    const daysSinceActivity = daysSince(b.last_activity_at, this.now());
    const result = computeMood({
      priceChange24hPct: stats.priceChange24hPct,
      volume24hUsd: stats.volume24hUsd,
      uniqueBuyers24h: stats.uniqueBuyers24h,
      daysSinceActivity,
    });

    let changed = false;
    if (result.mood !== b.current_mood) {
      try {
        await this.repo.updateMood(b.id, result.mood, result.reason);
        changed = true;
        logMoodChange(b, result.mood, result.reason, stats);
      } catch (err) {
        console.warn(
          `[MoodLoop] updateMood failed for ${b.coin_mint}: ${err instanceof Error ? err.message : String(err)}`,
        );
        return 'failed';
      }
    }

    try {
      await this.repo.updateStats(b.id, {
        coin_symbol: stats.symbol ?? b.coin_symbol,
        coin_name: stats.name ?? b.coin_name,
        last_stats_at: new Date(this.now()).toISOString(),
        last_price_usd: stats.priceUsd,
        last_volume24h_usd: stats.volume24hUsd,
        last_price_change_24h_pct: stats.priceChange24hPct,
      });
    } catch (err) {
      console.warn(
        `[MoodLoop] updateStats failed for ${b.coin_mint}: ${err instanceof Error ? err.message : String(err)}`,
      );
      // Stats persistence failure shouldn't mask mood change success.
    }

    return changed ? 'changed' : 'unchanged';
  }
}

function daysSince(iso: string, nowMs: number): number {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, (nowMs - t) / 86_400_000);
}

function logMoodChange(b: Bagimon, to: Mood, reason: string, stats: CoinStats): void {
  const label = b.coin_symbol ? `$${b.coin_symbol}` : b.coin_mint.slice(0, 8);
  const extra =
    stats.priceChange24hPct != null
      ? ` price24h=${stats.priceChange24hPct.toFixed(2)}%`
      : '';
  const volPart = stats.volume24hUsd != null ? ` vol24h=$${stats.volume24hUsd.toFixed(0)}` : '';
  console.info(
    `[MoodLoop] ${label}: ${b.current_mood} → ${to} (${reason})${extra}${volPart}`,
  );
}
