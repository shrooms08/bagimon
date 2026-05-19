import { describe, expect, it } from 'vitest';
import { buildSystemPrompt } from '../prompts/system.js';
import { buildUserMessage } from '../prompts/user.js';
import type { PersonalityContext } from '../types.js';

describe('buildSystemPrompt', () => {
  it('mentions the species name and the mood', () => {
    const p = buildSystemPrompt({ species: 'ghotosai', mood: 'happy', coinSymbol: 'WIF' });
    expect(p).toContain('Ghotosai');
    expect(p).toContain('happy');
    expect(p).toContain('$WIF');
  });

  it('uses distinct voice text per species', () => {
    const a = buildSystemPrompt({ species: 'ghotosai', mood: 'happy', coinSymbol: null });
    const b = buildSystemPrompt({ species: 'potatiki', mood: 'happy', coinSymbol: null });
    expect(a).not.toEqual(b);
    expect(a.toLowerCase()).toMatch(/drift|ghost|realm/);
    expect(b.toLowerCase()).toMatch(/root|leaf|soil|sun/);
  });

  it('falls back to a generic phrase when symbol is null', () => {
    const p = buildSystemPrompt({ species: 'potatiki', mood: 'dying', coinSymbol: null });
    expect(p).toContain('unnamed');
  });

  it('stays under ~500 input tokens (approx 2000 chars)', () => {
    for (const species of ['ghotosai', 'potatiki'] as const) {
      for (const mood of ['happy', 'hungry', 'sick', 'thriving', 'dying'] as const) {
        const p = buildSystemPrompt({ species, mood, coinSymbol: 'ABCDEFG' });
        expect(p.length).toBeLessThan(2000);
      }
    }
  });

  it('never leaks raw rules markers to the user', () => {
    const p = buildSystemPrompt({ species: 'ghotosai', mood: 'happy', coinSymbol: 'X' });
    expect(p.toLowerCase()).not.toContain('llm');
    expect(p.toLowerCase()).not.toContain('anthropic');
  });
});

function makeCtx(overrides: Partial<PersonalityContext> = {}): PersonalityContext {
  return {
    bagimonId: 'bg-1',
    species: 'ghotosai',
    mood: 'happy',
    coinSymbol: 'WIF',
    coinName: 'dogwifhat',
    priceChange24hPct: 4.3,
    volume24hUsd: 125_000,
    recentMoodHistory: [],
    previousInteractions: [],
    petterDisplayName: 'minos',
    ...overrides,
  };
}

describe('buildUserMessage', () => {
  it('greets by petter name', () => {
    const msg = buildUserMessage(makeCtx());
    expect(msg).toContain('minos');
  });

  it('omits state section when all stats are null', () => {
    const msg = buildUserMessage(
      makeCtx({ coinSymbol: null, priceChange24hPct: null, volume24hUsd: null }),
    );
    expect(msg).not.toContain("coin's current state");
  });

  it('includes memory entries when present', () => {
    const now = Date.now();
    const msg = buildUserMessage(
      makeCtx({
        previousInteractions: [
          { petterDisplayName: 'alex', response: 'Drifts closer...', at: new Date(now - 60_000 * 5) },
        ],
      }),
      now,
    );
    expect(msg).toContain('alex');
    expect(msg).toContain('Drifts closer');
  });

  it('truncates overly long memory entries', () => {
    const longText = 'x'.repeat(500);
    const msg = buildUserMessage(
      makeCtx({
        previousInteractions: [
          { petterDisplayName: 'alex', response: longText, at: new Date() },
        ],
      }),
    );
    expect(msg).not.toContain('x'.repeat(200));
  });

  it('keeps full message under ~300 token budget (≈1200 chars)', () => {
    const msg = buildUserMessage(
      makeCtx({
        recentMoodHistory: [
          { mood: 'happy', trigger: 'spawn', at: new Date(Date.now() - 7_200_000) },
          { mood: 'hungry', trigger: 'low_volume_24h', at: new Date(Date.now() - 3_600_000) },
        ],
        previousInteractions: [
          { petterDisplayName: 'a', response: 'hello there friend', at: new Date(Date.now() - 60_000) },
          { petterDisplayName: 'b', response: 'come back soon', at: new Date(Date.now() - 3_600_000) },
          { petterDisplayName: 'c', response: 'I missed you', at: new Date(Date.now() - 7_200_000) },
        ],
      }),
    );
    expect(msg.length).toBeLessThan(1200);
  });

  it('formats negative price change with a minus sign', () => {
    const msg = buildUserMessage(makeCtx({ priceChange24hPct: -12.5 }));
    expect(msg).toContain('-12.50%');
  });
});
