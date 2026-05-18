import type { ChatInputCommandInteraction } from 'discord.js';
import type { BagimonRepository } from '@bagimon/db';
import type { Mood } from '@bagimon/shared';
import { resolveBagimon } from '../lib/resolve-bagimon.js';
import { ambiguousMintReply, MOOD_EMOJI } from '../lib/discord-helpers.js';
import { mintToSeed } from '@bagimon/shared';

const PET_LINES: Record<Mood, readonly string[]> = {
  happy: [
    'Your Bagimon is delighted!',
    'Your Bagimon purrs.',
    'Your Bagimon does a happy dance.',
  ],
  hungry: [
    'Your Bagimon looks at you with hungry eyes.',
    '*stomach growls audibly*',
  ],
  sick: [
    'Your Bagimon coughs weakly.',
    "Your Bagimon doesn't have the energy to respond.",
  ],
  thriving: [
    'Your Bagimon is at the peak of its power!',
    'Your Bagimon glows with joy.',
  ],
  dying: [
    "Your Bagimon's eyes flutter open... barely.",
    '*faint heartbeat*',
  ],
};

function pickLine(mood: Mood, mint: string): string {
  const lines = PET_LINES[mood];
  // Use mint seed + minute-bucket so pets cycle responses but feel coin-specific.
  const seed = mintToSeed(mint);
  const seedByte = seed[0] ?? 0;
  const idx = (seedByte + Math.floor(Date.now() / 60_000)) % lines.length;
  return lines[idx]!;
}

export async function handlePet(
  interaction: ChatInputCommandInteraction,
  repo: BagimonRepository,
): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'Run this in a server.', ephemeral: true });
    return;
  }
  const mint = interaction.options.getString('mint');
  const result = await resolveBagimon(repo, interaction.guildId, mint);

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
  await repo.touchActivity(bagimon.id);
  const line = pickLine(bagimon.current_mood, bagimon.coin_mint);
  await interaction.reply({
    content: `${MOOD_EMOJI[bagimon.current_mood]} ${line}`,
    ephemeral: true,
  });
}
