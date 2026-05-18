import type { ChatInputCommandInteraction } from 'discord.js';
import type { BagimonRepository } from '@bagimon/db';
import { findSpecies } from '@bagimon/shared';
import { resolveBagimon } from '../lib/resolve-bagimon.js';
import { ambiguousMintReply } from '../lib/discord-helpers.js';
import { getTraitsConfig, traitsForMint } from '../lib/bagimon-image.js';

export async function handleLore(
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
    await interaction.reply({ content: 'No Bagimon here to recount.', ephemeral: true });
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
  const species = findSpecies(config, traits.species);
  await interaction.reply({
    content: `Your Bagimon is a **${species.displayName}**. ${species.lore}`,
    ephemeral: true,
  });
}
