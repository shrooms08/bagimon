export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly maxCalls: number,
    private readonly windowMs: number,
  ) {}

  private prune(key: string, now: number): number[] {
    const cutoff = now - this.windowMs;
    const existing = this.hits.get(key) ?? [];
    const kept = existing.filter((t) => t > cutoff);
    if (kept.length === 0) {
      this.hits.delete(key);
    } else {
      this.hits.set(key, kept);
    }
    return kept;
  }

  isAllowed(key: string, now: number = Date.now()): boolean {
    const kept = this.prune(key, now);
    return kept.length < this.maxCalls;
  }

  record(key: string, now: number = Date.now()): void {
    const kept = this.prune(key, now);
    kept.push(now);
    this.hits.set(key, kept);
  }
}
