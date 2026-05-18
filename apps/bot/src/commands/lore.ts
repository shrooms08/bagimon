import type { ChatInputCommandInteraction } from 'discord.js';
import type { BagimonRepository } from '@bagimon/db';
import { resolveBagimon } from '../lib/resolve-bagimon.js';
import { ambiguousMintReply } from '../lib/discord-helpers.js';
import { shortMint } from '../lib/mint.js';

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
  const ticker = bagimon.coin_symbol ? `$${bagimon.coin_symbol}` : `\`${shortMint(bagimon.coin_mint)}\``;
  const bornDate = new Date(bagimon.born_at).toISOString().slice(0, 10);
  const lore = `This Bagimon was born of ${ticker}, a coin first traded on ${bornDate}. Like all Bagimons, it draws life from its community.`;
  await interaction.reply({ content: lore, ephemeral: true });
}
