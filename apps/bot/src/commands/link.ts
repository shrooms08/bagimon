import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { BagimonRepository } from '@bagimon/db';
import { findSpecies } from '@bagimon/shared';
import { resolveBagimon } from '../lib/resolve-bagimon.js';
import { ambiguousMintReply, MOOD_EMOJI } from '../lib/discord-helpers.js';
import { getTraitsConfig, traitsForMint } from '../lib/bagimon-image.js';

const DEFAULT_BASE = 'https://bagimon.vercel.app';

export async function handleLink(
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
          ? 'No Bagimon for that mint here. Try `/bagimon spawn <mint>`.'
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
    case 'not-in-server':
      await interaction.reply({ content: 'Not available.', ephemeral: true });
      return;
    case 'found': {
      const { bagimon } = result;
      const base = (process.env.PETDEX_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, '');
      const url = `${base}/p/${bagimon.id}`;
      const config = await getTraitsConfig();
      const traits = traitsForMint(bagimon.coin_mint, config);
      const species = findSpecies(config, traits.species);
      const symbol = bagimon.coin_symbol ? `$${bagimon.coin_symbol}` : 'Bagimon';
      const embed = new EmbedBuilder()
        .setTitle(`${symbol} — Petdex`)
        .setURL(url)
        .setDescription(
          `${species.displayName} · ${MOOD_EMOJI[bagimon.current_mood]} ${bagimon.current_mood}`,
        )
        .setFooter({ text: 'share with your community' });
      await interaction.reply({ content: url, embeds: [embed] });
      return;
    }
  }
}
