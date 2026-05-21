import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { BagimonRepository } from '@bagimon/db';
import {
  validateBagsPool,
  fetchLifetimeFees,
  fetchCreators,
  getPrimaryCreator,
} from '@bagimon/bags-api';
import { isLikelyMint, shortMint } from '../lib/mint.js';
import { renderBagimonAttachment } from '../lib/bagimon-image.js';

export async function handleSpawn(
  interaction: ChatInputCommandInteraction,
  repo: BagimonRepository,
): Promise<void> {
  const mint = interaction.options.getString('mint', true).trim();

  if (!isLikelyMint(mint)) {
    await interaction.reply({
      content: `\`${mint}\` doesn't look like a Solana mint address (base58, 32–44 chars).`,
      ephemeral: true,
    });
    return;
  }
  if (!interaction.guildId) {
    await interaction.reply({ content: 'Bagimons can only be spawned in a server.', ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const existing = await repo.findByServerAndMint(interaction.guildId, mint);
  if (existing) {
    await interaction.editReply({
      content: `This server already has a Bagimon for \`${shortMint(mint)}\`. Use \`/bagimon stats\` to check on it.`,
    });
    return;
  }

  if (process.env.BAGS_API_KEY) {
    const isBagsCoin = await validateBagsPool(mint);
    if (!isBagsCoin) {
      await interaction.editReply({
        content: [
          "🤔 That doesn't look like a Bags coin.",
          '',
          'Bagimon only works for coins launched on **Bags.fm**.',
          'You can find Bags coins at https://bags.fm',
          '',
          `Mint checked: \`${mint}\``,
        ].join('\n'),
      });
      return;
    }
  }

  const [feesResult, creatorsResult] = await Promise.all([
    fetchLifetimeFees(mint),
    fetchCreators(mint),
  ]);
  const primaryCreator = creatorsResult ? getPrimaryCreator(creatorsResult) : null;

  const bagimon = await repo.spawn({
    discord_server_id: interaction.guildId,
    discord_server_name: interaction.guild?.name ?? null,
    coin_mint: mint,
    spawned_by_discord_user_id: interaction.user.id,
  });

  await repo.updateBagsData(bagimon.id, {
    lifetimeFeesLamports: feesResult?.lamports ?? null,
    lifetimeFeesSol: feesResult?.sol ?? null,
    creator: primaryCreator
      ? {
          provider: primaryCreator.provider ?? null,
          username: primaryCreator.username ?? null,
          providerUsername: primaryCreator.providerUsername ?? null,
          wallet: primaryCreator.wallet ?? null,
          pfp: primaryCreator.pfp ?? null,
          royaltyBps: primaryCreator.royaltyBps ?? null,
        }
      : null,
    error: null,
  });

  const { attachment, species } = await renderBagimonAttachment(
    mint,
    'happy',
    `bagimon-${shortMint(mint)}.png`,
  );

  const embed = new EmbedBuilder()
    .setTitle(`A wild ${species.displayName} appeared!`)
    .setDescription(`${species.lore}\n\nBorn from \`${shortMint(mint)}\`.`)
    .setColor(0xffd166)
    .setImage(`attachment://${attachment.name ?? 'bagimon.png'}`)
    .setFooter({ text: 'Use /bagimon pet to interact' });

  await interaction.editReply({ embeds: [embed], files: [attachment] });
  void bagimon;
}
