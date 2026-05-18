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

export function statsEmbed(bagimon: Bagimon, parentCount: number): EmbedBuilder {
  const bornMs = Date.parse(bagimon.born_at);
  const days = Math.max(0, Math.floor((Date.now() - bornMs) / 86_400_000));
  const lastActivityTs = Math.floor(Date.parse(bagimon.last_activity_at) / 1000);
  const display = bagimon.coin_symbol ? `$${bagimon.coin_symbol}` : shortMint(bagimon.coin_mint);
  return new EmbedBuilder()
    .setTitle(`Bagimon — ${display}`)
    .setColor(MOOD_COLOR[bagimon.current_mood])
    .addFields(
      { name: 'Mood', value: moodLabel(bagimon.current_mood), inline: true },
      { name: 'Age', value: `${days} day${days === 1 ? '' : 's'}`, inline: true },
      { name: 'Parents', value: String(parentCount), inline: true },
      { name: 'Coin mint', value: shortMint(bagimon.coin_mint), inline: false },
      { name: 'Last activity', value: `<t:${lastActivityTs}:R>`, inline: false },
    );
}

export function ambiguousMintReply(mints: readonly string[]): string {
  const list = mints.map((m) => `• \`${shortMint(m)}\``).join('\n');
  return `This server has multiple Bagimons. Specify a \`mint\`:\n${list}`;
}
