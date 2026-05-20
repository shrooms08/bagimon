import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type {
  BagimonRepository,
  InteractionsRepository,
  AiCallsRepository,
  MoodTransitionsRepository,
} from '@bagimon/db';
import type { PersonalityContext, PersonalityService } from '@bagimon/ai';
import type { Mood, SpeciesId } from '@bagimon/shared';
import { resolveBagimon } from '../lib/resolve-bagimon.js';
import { ambiguousMintReply, MOOD_EMOJI, memorialReply } from '../lib/discord-helpers.js';
import { findSpecies, mintToSeed } from '@bagimon/shared';
import { getTraitsConfig, renderBagimonAttachment, traitsForMint } from '../lib/bagimon-image.js';

const PET_LINES: Record<Mood, readonly string[]> = {
  happy: [
    'Your Bagimon is delighted!',
    'Your Bagimon purrs.',
    'Your Bagimon does a happy dance.',
  ],
  hungry: ['Your Bagimon looks at you with hungry eyes.', '*stomach growls audibly*'],
  sick: [
    'Your Bagimon coughs weakly.',
    "Your Bagimon doesn't have the energy to respond.",
  ],
  thriving: [
    'Your Bagimon is at the peak of its power!',
    'Your Bagimon glows with joy.',
  ],
  dying: ["Your Bagimon's eyes flutter open... barely.", '*faint heartbeat*'],
};

const SPECIES_LINES: Partial<Record<SpeciesId, Partial<Record<Mood, readonly string[]>>>> = {
  ghotosai: {
    happy: ['Your Ghotosai phases through your hand, giggling.'],
    sick: ['Your Ghotosai flickers translucent.'],
    thriving: ['Your Ghotosai radiates spectral light.'],
    dying: ['Your Ghotosai is fading... you can see the wall through it.'],
  },
  potatiki: {
    happy: ['Your Potatiki wiggles its leaves at you.'],
    hungry: ['Your Potatiki digs at the soil hopefully.'],
    sick: ['Your Potatiki droops, leaves curling brown at the edges.'],
    thriving: ['Your Potatiki sprouts a tiny new leaf.'],
  },
};

// Deterministic canned-line picker. Exported for use as the
// PersonalityService.fallbackProvider so behaviour matches the pre-Phase-4 bot
// whenever Claude is unavailable.
export function pickCannedLine(ctx: PersonalityContext, mint: string): string {
  const seed = mintToSeed(mint);
  const seedByte = seed[0] ?? 0;
  const minute = Math.floor(Date.now() / 60_000);
  const speciesVariants = SPECIES_LINES[ctx.species]?.[ctx.mood];
  const useSpecies =
    speciesVariants && speciesVariants.length > 0 && (seedByte + minute) % 10 < 3;
  const lines = useSpecies && speciesVariants ? speciesVariants : PET_LINES[ctx.mood];
  const idx = (seedByte + minute) % lines.length;
  return lines[idx]!;
}

// Mint-agnostic fallback used at service construction time. We don't know the
// mint upfront, so we derive a stable byte from the bagimonId instead.
export function genericFallback(ctx: PersonalityContext): string {
  const fakeMint = ctx.bagimonId;
  return pickCannedLine(ctx, fakeMint);
}

export interface PetDeps {
  bagimons: BagimonRepository;
  interactions: InteractionsRepository;
  aiCalls: AiCallsRepository;
  moodTransitions: MoodTransitionsRepository;
  personality: PersonalityService;
}

export async function handlePet(
  interaction: ChatInputCommandInteraction,
  deps: PetDeps,
): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'Run this in a server.', ephemeral: true });
    return;
  }
  const mint = interaction.options.getString('mint');
  const result = await resolveBagimon(deps.bagimons, interaction.guildId, mint);

  if (result.kind === 'none') {
    await interaction.reply({ content: 'No Bagimon to pet here.', ephemeral: true });
    return;
  }
  if (result.kind === 'ambiguous') {
    await interaction.reply({
      content: ambiguousMintReply(result.bagimons.map((b) => b.coin_mint)),
      ephemeral: true,
    });
    return;
  }
  if (result.kind === 'not-in-server') return;

  const { bagimon } = result;
  const config = await getTraitsConfig();
  const traits = traitsForMint(bagimon.coin_mint, config);

  if (!bagimon.is_alive) {
    const species = findSpecies(config, traits.species);
    await interaction.reply({ ...memorialReply(bagimon, species.displayName), ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const [recentInteractions, recentTransitions] = await Promise.all([
    deps.interactions.getRecent(bagimon.id, 3),
    deps.moodTransitions.getRecent(bagimon.id, 3),
  ]);

  const member = interaction.member;
  const petterDisplayName =
    member && typeof (member as { displayName?: unknown }).displayName === 'string'
      ? (member as { displayName: string }).displayName
      : interaction.user.username;

  const ctx: PersonalityContext = {
    bagimonId: bagimon.id,
    species: traits.species,
    mood: bagimon.current_mood,
    coinSymbol: bagimon.coin_symbol,
    coinName: bagimon.coin_name,
    priceChange24hPct: bagimon.last_price_change_24h_pct,
    volume24hUsd: bagimon.last_volume24h_usd,
    recentMoodHistory: recentTransitions.map((t) => ({
      mood: t.to_mood,
      trigger: t.trigger_reason ?? 'unknown',
      at: new Date(t.created_at),
    })),
    previousInteractions: recentInteractions.map((i) => ({
      petterDisplayName: i.petter_discord_display_name,
      response: i.response_text,
      at: new Date(i.created_at),
    })),
    petterDisplayName,
  };

  const response = await deps.personality.generate(ctx, interaction.user.id);

  await Promise.allSettled([
    deps.interactions.record({
      bagimonId: bagimon.id,
      petterDiscordUserId: interaction.user.id,
      petterDisplayName,
      responseText: response.text,
      source: response.source,
    }),
    deps.aiCalls.log({
      bagimonId: bagimon.id,
      discordUserId: interaction.user.id,
      model: 'claude-haiku-4-5',
      inputTokens: response.cost?.inputTokens ?? 0,
      outputTokens: response.cost?.outputTokens ?? 0,
      costUsdEstimate: response.cost?.usdEstimate ?? 0,
      latencyMs: response.latencyMs,
      succeeded: response.source === 'haiku',
      ...(response.fallbackReason ? { fallbackReason: response.fallbackReason } : {}),
    }),
    deps.bagimons.touchActivity(bagimon.id),
  ]);

  const { attachment } = await renderBagimonAttachment(
    bagimon.coin_mint,
    bagimon.current_mood,
    'bagimon.png',
  );
  const embed = new EmbedBuilder()
    .setDescription(`${MOOD_EMOJI[bagimon.current_mood]} ${response.text}`)
    .setImage('attachment://bagimon.png');

  await interaction.editReply({ embeds: [embed], files: [attachment] });
}
