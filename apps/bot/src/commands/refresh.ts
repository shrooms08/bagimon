import type { ChatInputCommandInteraction } from 'discord.js';
import type { BagimonRepository } from '@bagimon/db';
import { findSpecies } from '@bagimon/shared';
import type { MoodLoop } from '../mood-loop/index.js';
import { memorialReply } from '../lib/discord-helpers.js';
import { getTraitsConfig, traitsForMint } from '../lib/bagimon-image.js';

const RATE_LIMIT_MS = 60_000;
const lastInvocation = new Map<string, number>();

export async function handleRefresh(
  interaction: ChatInputCommandInteraction,
  moodLoop: MoodLoop,
  repo?: BagimonRepository,
): Promise<void> {
  const userId = interaction.user.id;
  const now = Date.now();
  const last = lastInvocation.get(userId);
  if (last && now - last < RATE_LIMIT_MS) {
    const wait = Math.ceil((RATE_LIMIT_MS - (now - last)) / 1000);
    await interaction.reply({
      content: `:hourglass: Slow down — try again in ${wait}s.`,
      ephemeral: true,
    });
    return;
  }
  lastInvocation.set(userId, now);

  const mint = interaction.options.getString('mint') ?? undefined;
  if (mint && repo && interaction.guildId) {
    const target = await repo.findByServerAndMint(interaction.guildId, mint);
    if (target && !target.is_alive) {
      const config = await getTraitsConfig();
      const species = findSpecies(config, traitsForMint(target.coin_mint, config).species);
      await interaction.reply({
        ...memorialReply(target, species.displayName),
        ephemeral: true,
      });
      return;
    }
  }

  await interaction.deferReply({ ephemeral: true });
  const summary = await moodLoop.runOnce(mint);
  await interaction.editReply({
    content:
      `:repeat: Mood loop tick complete\n` +
      `• evaluated: ${summary.evaluated}\n` +
      `• mood changes: ${summary.moodChanged}\n` +
      `• died: ${summary.died}\n` +
      `• failed: ${summary.failed}\n` +
      `• duration: ${(summary.durationMs / 1000).toFixed(2)}s`,
  });
}
