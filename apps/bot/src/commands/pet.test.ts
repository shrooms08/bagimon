import { describe, expect, it, vi } from 'vitest';
import { handlePet, genericFallback } from './pet.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type {
  BagimonRepository,
  InteractionsRepository,
  AiCallsRepository,
  MoodTransitionsRepository,
  Bagimon,
} from '@bagimon/db';
import type { PersonalityContext, PersonalityResponse, PersonalityService } from '@bagimon/ai';

function makeBagimon(overrides: Partial<Bagimon> = {}): Bagimon {
  const now = new Date().toISOString();
  return {
    id: 'bg-1',
    discord_server_id: 'srv-1',
    discord_server_name: 'test',
    // A real-looking 32-byte mint isn't required; the importer just needs
    // something stable.
    coin_mint: '11111111111111111111111111111111',
    coin_symbol: 'TEST',
    coin_name: 'Test Coin',
    current_mood: 'happy',
    is_alive: true,
    born_at: now,
    died_at: null,
    last_activity_at: now,
    spawned_by_discord_user_id: 'user-1',
    created_at: now,
    updated_at: now,
    last_stats_at: now,
    last_price_usd: 0.01,
    last_volume24h_usd: 50_000,
    last_price_change_24h_pct: 4.5,
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
    ...overrides,
  };
}

function makeDeps(opts: {
  response: PersonalityResponse;
  bagimon?: Bagimon;
}) {
  const bagimon = opts.bagimon ?? makeBagimon();
  const bagimons = {
    findByServerAndMint: vi.fn(async () => bagimon),
    findByServer: vi.fn(async () => [bagimon]),
    touchActivity: vi.fn(async () => undefined),
  } as unknown as BagimonRepository;
  const interactions = {
    record: vi.fn(async () => undefined),
    getRecent: vi.fn(async () => []),
  } as unknown as InteractionsRepository;
  const aiCalls = {
    log: vi.fn(async () => undefined),
  } as unknown as AiCallsRepository;
  const moodTransitions = {
    getRecent: vi.fn(async () => []),
  } as unknown as MoodTransitionsRepository;
  const personality = {
    generate: vi.fn(async () => opts.response),
  } as unknown as PersonalityService;
  return { bagimons, interactions, aiCalls, moodTransitions, personality };
}

function makeInteraction() {
  const deferReply = vi.fn(async () => undefined);
  const editReply = vi.fn(async () => undefined);
  const reply = vi.fn(async () => undefined);
  return {
    interaction: {
      guildId: 'srv-1',
      user: { id: 'user-42', username: 'alex' },
      member: { displayName: 'Alex the Brave' },
      options: { getString: () => null },
      deferReply,
      editReply,
      reply,
    } as unknown as ChatInputCommandInteraction,
    deferReply,
    editReply,
    reply,
  };
}

describe('handlePet', () => {
  it('renders haiku response in an embed and records interaction + ai_call', async () => {
    const response: PersonalityResponse = {
      text: 'Drifts closer, Alex... soft and warm.',
      source: 'haiku',
      cost: { inputTokens: 220, outputTokens: 17, usdEstimate: 0.0003 },
      latencyMs: 540,
    };
    const deps = makeDeps({ response });
    const { interaction, editReply } = makeInteraction();
    await handlePet(interaction, deps);

    expect(deps.personality.generate).toHaveBeenCalledOnce();
    expect(deps.interactions.record).toHaveBeenCalledWith(
      expect.objectContaining({
        bagimonId: 'bg-1',
        petterDisplayName: 'Alex the Brave',
        source: 'haiku',
        responseText: response.text,
      }),
    );
    expect(deps.aiCalls.log).toHaveBeenCalledWith(
      expect.objectContaining({
        bagimonId: 'bg-1',
        succeeded: true,
        inputTokens: 220,
        outputTokens: 17,
      }),
    );
    expect(deps.bagimons.touchActivity).toHaveBeenCalledWith('bg-1');
    expect(editReply).toHaveBeenCalledOnce();
  });

  it('records source=fallback and succeeded=false when the service falls back', async () => {
    const response: PersonalityResponse = {
      text: 'Your Bagimon purrs.',
      source: 'fallback',
      cost: null,
      latencyMs: 1,
      fallbackReason: 'missing_api_key',
    };
    const deps = makeDeps({ response });
    const { interaction } = makeInteraction();
    await handlePet(interaction, deps);

    expect(deps.interactions.record).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'fallback' }),
    );
    expect(deps.aiCalls.log).toHaveBeenCalledWith(
      expect.objectContaining({
        succeeded: false,
        fallbackReason: 'missing_api_key',
        inputTokens: 0,
        outputTokens: 0,
      }),
    );
  });

  it('passes loaded mood history and previous interactions into the personality context', async () => {
    const response: PersonalityResponse = {
      text: 'hi',
      source: 'haiku',
      cost: { inputTokens: 100, outputTokens: 10, usdEstimate: 0.0001 },
      latencyMs: 100,
    };
    const deps = makeDeps({ response });
    (deps.moodTransitions.getRecent as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        id: 't1',
        bagimon_id: 'bg-1',
        from_mood: 'happy',
        to_mood: 'hungry',
        trigger_reason: 'low_volume_24h',
        created_at: new Date(Date.now() - 60_000).toISOString(),
      },
    ]);
    (deps.interactions.getRecent as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        id: 'i1',
        bagimon_id: 'bg-1',
        petter_discord_user_id: 'u-9',
        petter_discord_display_name: 'old friend',
        response_text: 'come back soon',
        source: 'haiku',
        created_at: new Date(Date.now() - 120_000).toISOString(),
      },
    ]);
    const { interaction } = makeInteraction();
    await handlePet(interaction, deps);

    const generateCall = (deps.personality.generate as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(generateCall).toBeDefined();
    const ctx = generateCall![0] as PersonalityContext;
    expect(ctx.recentMoodHistory).toHaveLength(1);
    expect(ctx.recentMoodHistory[0]?.mood).toBe('hungry');
    expect(ctx.recentMoodHistory[0]?.trigger).toBe('low_volume_24h');
    expect(ctx.previousInteractions).toHaveLength(1);
    expect(ctx.previousInteractions[0]?.response).toBe('come back soon');
  });
});

describe('genericFallback', () => {
  it('returns a non-empty string for every mood', () => {
    for (const mood of ['happy', 'hungry', 'sick', 'thriving', 'dying'] as const) {
      const text = genericFallback({
        bagimonId: 'bg-x',
        species: 'ghotosai',
        mood,
        coinSymbol: null,
        coinName: null,
        priceChange24hPct: null,
        volume24hUsd: null,
        recentMoodHistory: [],
        previousInteractions: [],
        petterDisplayName: 'someone',
      });
      expect(text.length).toBeGreaterThan(0);
    }
  });
});
