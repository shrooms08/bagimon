import { describe, expect, it, vi } from 'vitest';
import { PersonalityService, type PersonalityLogEvent } from '../personality-service.js';
import { RateLimiter } from '../rate-limiter.js';
import type { PersonalityContext } from '../types.js';

function makeCtx(overrides: Partial<PersonalityContext> = {}): PersonalityContext {
  return {
    bagimonId: 'bg-1',
    species: 'ghotosai',
    mood: 'happy',
    coinSymbol: 'WIF',
    coinName: 'dogwifhat',
    priceChange24hPct: 1.2,
    volume24hUsd: 50_000,
    recentMoodHistory: [],
    previousInteractions: [],
    petterDisplayName: 'minos',
    ...overrides,
  };
}

function makeService(opts: {
  haiku?: ReturnType<typeof vi.fn>;
  hasKey?: boolean;
  userLimit?: { max: number; windowMs: number };
  bagimonLimit?: { max: number; windowMs: number };
}) {
  const events: PersonalityLogEvent[] = [];
  const fallback = vi.fn((_ctx: PersonalityContext) => 'canned line');
  const service = new PersonalityService({
    userBagimonLimiter: new RateLimiter(
      opts.userLimit?.max ?? 3,
      opts.userLimit?.windowMs ?? 60_000,
    ),
    bagimonLimiter: new RateLimiter(
      opts.bagimonLimit?.max ?? 20,
      opts.bagimonLimit?.windowMs ?? 60_000,
    ),
    fallbackProvider: fallback,
    apiKeyPresent: () => opts.hasKey ?? true,
    haikuCaller:
      opts.haiku ??
      vi.fn(async () => ({ text: 'drifts closer...', inputTokens: 200, outputTokens: 30 })),
    logger: (e) => events.push(e),
  });
  return { service, fallback, events };
}

describe('PersonalityService', () => {
  it('falls back when ANTHROPIC_API_KEY is missing', async () => {
    const { service, fallback, events } = makeService({ hasKey: false });
    const res = await service.generate(makeCtx(), 'user-1');
    expect(res.source).toBe('fallback');
    expect(res.fallbackReason).toBe('missing_api_key');
    expect(fallback).toHaveBeenCalledOnce();
    expect(events[0]?.succeeded).toBe(false);
    expect(events[0]?.fallbackReason).toBe('missing_api_key');
  });

  it('calls haiku and returns the text on success', async () => {
    const haiku = vi.fn(async () => ({
      text: 'Soft and warm, minos. *drifts closer*',
      inputTokens: 250,
      outputTokens: 18,
    }));
    const { service, events } = makeService({ haiku });
    const res = await service.generate(makeCtx(), 'user-1');
    expect(res.source).toBe('haiku');
    expect(res.text).toContain('drifts closer');
    expect(res.cost?.inputTokens).toBe(250);
    expect(res.cost?.outputTokens).toBe(18);
    expect(res.cost?.usdEstimate).toBeGreaterThan(0);
    expect(events[0]?.succeeded).toBe(true);
  });

  it('falls back on api error', async () => {
    const haiku = vi.fn(async () => {
      throw new Error('429 too many requests');
    });
    const { service, fallback, events } = makeService({ haiku });
    const res = await service.generate(makeCtx(), 'user-1');
    expect(res.source).toBe('fallback');
    expect(res.fallbackReason).toMatch(/api_error/);
    expect(fallback).toHaveBeenCalledOnce();
    expect(events[0]?.succeeded).toBe(false);
  });

  it('falls back on per-user rate limit', async () => {
    const haiku = vi.fn(async () => ({ text: 'hi', inputTokens: 10, outputTokens: 5 }));
    const { service } = makeService({ haiku, userLimit: { max: 1, windowMs: 60_000 } });
    const r1 = await service.generate(makeCtx(), 'user-1');
    expect(r1.source).toBe('haiku');
    const r2 = await service.generate(makeCtx(), 'user-1');
    expect(r2.source).toBe('fallback');
    expect(r2.fallbackReason).toBe('rate_limit_user');
    // Different user not limited
    const r3 = await service.generate(makeCtx(), 'user-2');
    expect(r3.source).toBe('haiku');
    expect(haiku).toHaveBeenCalledTimes(2);
  });

  it('falls back on global bagimon rate limit', async () => {
    const haiku = vi.fn(async () => ({ text: 'hi', inputTokens: 10, outputTokens: 5 }));
    const { service } = makeService({
      haiku,
      bagimonLimit: { max: 1, windowMs: 60_000 },
      userLimit: { max: 100, windowMs: 60_000 },
    });
    await service.generate(makeCtx(), 'user-1');
    const r = await service.generate(makeCtx(), 'user-2');
    expect(r.source).toBe('fallback');
    expect(r.fallbackReason).toBe('rate_limit_bagimon');
  });

  it('falls back when total tokens exceed budget', async () => {
    const haiku = vi.fn(async () => ({ text: 'x', inputTokens: 1400, outputTokens: 200 }));
    const { service } = makeService({ haiku });
    const r = await service.generate(makeCtx(), 'user-1');
    expect(r.source).toBe('fallback');
    expect(r.fallbackReason).toBe('token_budget_exceeded');
  });

  it('does not consume rate limit budget on fallback', async () => {
    const { service } = makeService({
      hasKey: false,
      userLimit: { max: 1, windowMs: 60_000 },
    });
    await service.generate(makeCtx(), 'user-1');
    // Even after a fallback, the budget should still be available — fallbacks
    // don't cost anything.
    const r = await service.generate(makeCtx(), 'user-1');
    expect(r.source).toBe('fallback');
    expect(r.fallbackReason).toBe('missing_api_key');
  });

  it('logs cost on success', async () => {
    const haiku = vi.fn(async () => ({ text: 'ok', inputTokens: 200, outputTokens: 50 }));
    const { service, events } = makeService({ haiku });
    await service.generate(makeCtx(), 'user-1');
    expect(events[0]?.inputTokens).toBe(200);
    expect(events[0]?.outputTokens).toBe(50);
    expect(events[0]?.costUsdEstimate).toBeGreaterThan(0);
  });
});
