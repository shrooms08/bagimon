import type {
  BagimonRepository,
  Bagimon,
  MoodTransitionsRepository,
} from '@bagimon/db';
import type { CoinStatsService, CoinStats } from '@bagimon/coin-data';
import { computeMood, continuousDyingDays, type Mood } from '@bagimon/shared';

export interface RunSummary {
  evaluated: number;
  moodChanged: number;
  died: number;
  failed: number;
  durationMs: number;
}

export interface MoodLoopOptions {
  intervalMs?: number;
  concurrency?: number;
  // Continuous-dying days before permanent death. Fractional allowed for demos.
  deathDaysThreshold?: number;
  // Repo used to read transition history when checking the death streak.
  moodTransitions?: MoodTransitionsRepository;
  // Optional hook fired after a Bagimon is marked dead — lets the bot kick the
  // death announcer immediately rather than waiting for its next interval.
  onDeath?: (b: Bagimon) => void | Promise<void>;
  // Allows tests to override the wall clock.
  now?: () => number;
}

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000;
const DEFAULT_CONCURRENCY = 5;
const DEFAULT_DEATH_DAYS = 14;

export class MoodLoop {
  private timer: NodeJS.Timeout | null = null;
  private readonly intervalMs: number;
  private readonly concurrency: number;
  private readonly deathDaysThreshold: number;
  private readonly moodTransitions: MoodTransitionsRepository | undefined;
  private readonly onDeath: ((b: Bagimon) => void | Promise<void>) | undefined;
  private readonly now: () => number;

  constructor(
    private readonly repo: BagimonRepository,
    private readonly coinStats: CoinStatsService,
    options: MoodLoopOptions = {},
  ) {
    this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);
    this.deathDaysThreshold = options.deathDaysThreshold ?? DEFAULT_DEATH_DAYS;
    this.moodTransitions = options.moodTransitions;
    this.onDeath = options.onDeath;
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
        `[MoodLoop] tick complete: evaluated=${summary.evaluated} moodChanged=${summary.moodChanged} died=${summary.died} failed=${summary.failed} duration=${(summary.durationMs / 1000).toFixed(1)}s`,
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
    let died = 0;
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
            if (outcome === 'died') died += 1;
            if (outcome === 'failed') failed += 1;
          }
        })(),
      );
    }
    await Promise.all(workers);

    return { evaluated, moodChanged, died, failed, durationMs: this.now() - startedAt };
  }

  private async evaluateOne(
    bSnapshot: Bagimon,
  ): Promise<'changed' | 'unchanged' | 'died' | 'failed'> {
    // Refresh the row — /bagimon expedite (or any other writer) may have
    // mutated current_mood between findAllAlive() and now. The death check
    // below reads current_mood, so it must see fresh state.
    const refreshed = await this.repo.findById(bSnapshot.id).catch(() => null);
    const b = refreshed ?? bSnapshot;
    if (!b.is_alive) return 'unchanged';

    let stats: CoinStats;
    try {
      stats = await this.coinStats.getStats(b.coin_mint);
    } catch (err) {
      console.warn(
        `[MoodLoop] coin-data failed for ${b.coin_mint}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return 'failed';
    }

    // Death check runs against the Bagimon's EXISTING current_mood, not the
    // freshly-computed mood. If a Bagimon has already been dying long enough,
    // it dies — regardless of what the next tick would compute. Recovery had
    // its chance in prior ticks.
    if (b.current_mood === 'dying' && this.moodTransitions) {
      try {
        const recent = await this.moodTransitions.getRecent(b.id, 50);
        const streak = continuousDyingDays(
          recent.map((t) => ({ mood: t.to_mood, createdAt: new Date(t.created_at) })),
          new Date(b.born_at),
          new Date(this.now()),
        );
        if (streak >= this.deathDaysThreshold) {
          try {
            await this.repo.markDead(b.id, {
              mood: 'dying',
              priceUsd: stats.priceUsd,
              volume24hUsd: stats.volume24hUsd,
            });
            logDeath(b, streak, stats);
            if (this.onDeath) {
              try {
                await this.onDeath(b);
              } catch (err) {
                console.warn(
                  `[MoodLoop] onDeath hook failed for ${b.coin_mint}: ${err instanceof Error ? err.message : String(err)}`,
                );
              }
            }
            return 'died';
          } catch (err) {
            console.warn(
              `[MoodLoop] markDead failed for ${b.coin_mint}: ${err instanceof Error ? err.message : String(err)}`,
            );
            return 'failed';
          }
        }
      } catch (err) {
        console.warn(
          `[MoodLoop] streak check failed for ${b.coin_mint}: ${err instanceof Error ? err.message : String(err)}`,
        );
        // Fall through to normal mood handling so a transient read doesn't
        // block the rest of the tick.
      }
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

function logDeath(b: Bagimon, days: number, stats: CoinStats): void {
  const label = b.coin_symbol ? `$${b.coin_symbol}` : b.coin_mint.slice(0, 8);
  const vol =
    stats.volume24hUsd != null ? `$${stats.volume24hUsd.toFixed(0)}` : 'unknown';
  console.info(
    `[MoodLoop] 💀 ${label} died after ${days.toFixed(1)}d of dying — final mood: dying, final volume: ${vol}`,
  );
}
