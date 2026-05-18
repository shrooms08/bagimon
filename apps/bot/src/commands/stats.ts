import type { ChatInputCommandInteraction } from 'discord.js';
import type { BagimonRepository } from '@bagimon/db';
import { resolveBagimon } from '../lib/resolve-bagimon.js';
import { ambiguousMintReply, statsEmbed } from '../lib/discord-helpers.js';

export async function handleStats(
  interaction: ChatInputCommandInteraction,
  repo: BagimonRepository,
): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'Run this in a server.', ephemeral: true });
    return;
  }
  const mint = interaction.options.getString('mint');
  const result = await resolveBagimon(repo, interaction.guildId, mint);

  switch (result.kind) {
    case 'none':
      await interaction.reply({
        content: mint
          ? 'No Bagimon for that mint in this server. Try `/bagimon spawn <mint>`.'
          : 'No Bagimons in this server yet. Try `/bagimon spawn <mint>`.',
        ephemeral: true,
      });
      return;
    case 'ambiguous':
      await interaction.reply({
        content: ambiguousMintReply(result.bagimons.map((b) => b.coin_mint)),
        ephemeral: true,
      });
      return;
    case 'found':
      await interaction.reply({ embeds: [statsEmbed(result.bagimon, 0)] });
      return;
    case 'not-in-server':
      await interaction.reply({ content: 'Not available.', ephemeral: true });
      return;
  }
}
