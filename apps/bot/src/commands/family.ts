import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { BagimonParentsRepository, BagimonRepository } from '@bagimon/db';
import { findSpecies } from '@bagimon/shared';
import { resolveBagimon } from '../lib/resolve-bagimon.js';
import { ambiguousMintReply, memorialReply } from '../lib/discord-helpers.js';
import { getTraitsConfig, traitsForMint } from '../lib/bagimon-image.js';

const CORAL = 0xe87a5e;

function shortWallet(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function formatAmount(amt: number): string {
  if (!Number.isFinite(amt)) return '—';
  const abs = Math.abs(amt);
  if (abs >= 1_000_000_000) return `${(amt / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(amt / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(amt / 1_000).toFixed(2)}K`;
  if (abs >= 1) return amt.toFixed(2);
  return amt.toPrecision(3);
}

function hoursAgo(iso: string, now = Date.now()): number {
  const diff = now - Date.parse(iso);
  return Math.max(0, Math.floor(diff / (60 * 60 * 1000)));
}

export async function handleFamily(
  interaction: ChatInputCommandInteraction,
  repo: BagimonRepository,
  parentsRepo: BagimonParentsRepository,
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
      if (!bagimon.is_alive) {
        const config = await getTraitsConfig();
        const species = findSpecies(config, traitsForMint(bagimon.coin_mint, config).species);
        await interaction.reply({
          ...memorialReply(bagimon, species.displayName),
          ephemeral: true,
        });
        return;
      }

      const parents = await parentsRepo.getLatestParents(bagimon.id);
      const symbol = bagimon.coin_symbol ? `$${bagimon.coin_symbol}` : 'Bagimon';
      if (parents.length === 0) {
        await interaction.reply({
          content: `No parent snapshots for ${symbol} yet. Check back in 24h.`,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`👨‍👩‍👧 The ${symbol} Family`)
        .setColor(CORAL)
        .setDescription(
          parents.length === 10
            ? `Top 10 holders, ranked by ${symbol} holdings.`
            : `Top ${parents.length} holders, ranked by ${symbol} holdings.`,
        );

      for (const p of parents) {
        const pct =
          p.holding_percent_of_supply != null
            ? ` · ${p.holding_percent_of_supply.toFixed(2)}%`
            : '';
        embed.addFields({
          name: `#${p.rank}  ${shortWallet(p.wallet_address)}`,
          value: `${formatAmount(p.holding_amount)} ${bagimon.coin_symbol ?? 'tokens'}${pct}`,
          inline: true,
        });
      }

      const first = parents[0];
      if (first) {
        const hrs = hoursAgo(first.snapshot_at);
        embed.setFooter({
          text: hrs === 0 ? 'Snapshotted just now' : `Snapshotted ${hrs} hour${hrs === 1 ? '' : 's'} ago`,
        });
      }

      await interaction.reply({ embeds: [embed] });
      return;
    }
  }
}
