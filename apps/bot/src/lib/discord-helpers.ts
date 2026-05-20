import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import type { Mood } from '@bagimon/shared';
import type { Bagimon } from '@bagimon/db';
import { shortMint } from './mint.js';

export const MOOD_EMOJI: Record<Mood, string> = {
  happy: '😊',
  hungry: '🍽️',
  sick: '🤒',
  thriving: '✨',
  dying: '💀',
};

const MOOD_COLOR: Record<Mood, ColorResolvable> = {
  happy: 0xffd166,
  hungry: 0xf4a261,
  sick: 0x6a994e,
  thriving: 0xef476f,
  dying: 0x4a4e69,
};

export function moodLabel(mood: Mood): string {
  return `${MOOD_EMOJI[mood]} ${mood}`;
}

function formatUsd(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toFixed(2)}`;
}

function formatPriceChange(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return '⚪️ —';
  const emoji = pct > 0.01 ? '🟢' : pct < -0.01 ? '🔴' : '⚪️';
  const sign = pct > 0 ? '+' : '';
  return `${emoji} ${sign}${pct.toFixed(2)}%`;
}

export function statsEmbed(
  bagimon: Bagimon,
  parentCount: number,
  speciesDisplayName?: string,
): EmbedBuilder {
  const bornMs = Date.parse(bagimon.born_at);
  const days = Math.max(0, Math.floor((Date.now() - bornMs) / 86_400_000));
  const lastActivityTs = Math.floor(Date.parse(bagimon.last_activity_at) / 1000);
  const nameLabel = bagimon.coin_name ?? null;
  const display = bagimon.coin_symbol
    ? `$${bagimon.coin_symbol}${nameLabel ? ` (${nameLabel})` : ''}`
    : shortMint(bagimon.coin_mint);
  const embed = new EmbedBuilder()
    .setTitle(`Bagimon — ${display}`)
    .setColor(MOOD_COLOR[bagimon.current_mood]);
  if (speciesDisplayName) {
    embed.addFields({ name: 'Species', value: speciesDisplayName, inline: true });
  }
  embed.addFields(
    { name: 'Mood', value: moodLabel(bagimon.current_mood), inline: true },
    { name: 'Age', value: `${days} day${days === 1 ? '' : 's'}`, inline: true },
    { name: 'Parents', value: String(parentCount), inline: true },
    {
      name: '24h price',
      value: formatPriceChange(bagimon.last_price_change_24h_pct),
      inline: true,
    },
    { name: '24h volume', value: formatUsd(bagimon.last_volume24h_usd), inline: true },
    {
      name: 'Last updated',
      value: bagimon.last_stats_at
        ? `<t:${Math.floor(Date.parse(bagimon.last_stats_at) / 1000)}:R>`
        : 'Not yet polled',
      inline: true,
    },
    { name: 'Coin mint', value: shortMint(bagimon.coin_mint), inline: false },
    { name: 'Last activity', value: `<t:${lastActivityTs}:R>`, inline: false },
  );
  return embed;
}

export function ambiguousMintReply(mints: readonly string[]): string {
  const list = mints.map((m) => `• \`${shortMint(m)}\``).join('\n');
  return `This server has multiple Bagimons. Specify a \`mint\`:\n${list}`;
}

const DEFAULT_PETDEX_BASE = 'https://bagimon.vercel.app';
const GREY = 0x8a8270;

export function petdexUrlFor(bagimonId: string): string {
  const base = (process.env.PETDEX_BASE_URL ?? DEFAULT_PETDEX_BASE).replace(/\/$/, '');
  return `${base}/p/${bagimonId}`;
}

function diedDaysAgo(diedAtIso: string | null): number {
  if (!diedAtIso) return 0;
  const t = Date.parse(diedAtIso);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

export function memorialReply(bagimon: Bagimon, speciesDisplayName: string): {
  embeds: EmbedBuilder[];
} {
  const symbol = bagimon.coin_symbol ? `$${bagimon.coin_symbol}` : 'Bagimon';
  const days = diedDaysAgo(bagimon.died_at);
  const url = petdexUrlFor(bagimon.id);
  const embed = new EmbedBuilder()
    .setColor(GREY)
    .setTitle(`💀 ${symbol} — in memoriam`)
    .setDescription(
      `${speciesDisplayName} is no longer with us. ${symbol} departed ${days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} ago`}.`,
    )
    .setFooter({ text: `Their Petdex page remains as a memorial: ${url}` });
  return { embeds: [embed] };
}

export function memorialStatsEmbed(bagimon: Bagimon, speciesDisplayName: string): EmbedBuilder {
  const symbol = bagimon.coin_symbol ? `$${bagimon.coin_symbol}` : shortMint(bagimon.coin_mint);
  const bornMs = Date.parse(bagimon.born_at);
  const diedMs = bagimon.died_at ? Date.parse(bagimon.died_at) : Date.now();
  const lifespanDays = Math.max(0, Math.floor((diedMs - bornMs) / 86_400_000));
  const url = petdexUrlFor(bagimon.id);
  return new EmbedBuilder()
    .setColor(GREY)
    .setTitle(`💀 ${symbol} — in memoriam`)
    .addFields(
      { name: 'Species', value: speciesDisplayName, inline: true },
      { name: 'Final mood', value: bagimon.final_mood ?? 'dying', inline: true },
      {
        name: 'Lifespan',
        value: `${lifespanDays} day${lifespanDays === 1 ? '' : 's'}`,
        inline: true,
      },
      {
        name: 'Died',
        value: bagimon.died_at ? `<t:${Math.floor(diedMs / 1000)}:D>` : 'unknown',
        inline: true,
      },
      {
        name: 'Final 24h volume',
        value: formatUsd(bagimon.final_volume24h_usd),
        inline: true,
      },
      {
        name: 'Final price',
        value: formatUsd(bagimon.final_price_usd),
        inline: true,
      },
    )
    .setFooter({ text: `Memorial: ${url}` });
}
