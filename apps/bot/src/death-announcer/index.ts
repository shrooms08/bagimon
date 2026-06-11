import { ChannelType, EmbedBuilder, type Client, type Guild, type TextChannel } from 'discord.js';
import type { Bagimon, BagimonRepository } from '@bagimon/db';
import { findSpecies } from '@bagimon/shared';
import { getTraitsConfig, renderBagimonAttachment, traitsForMint } from '../lib/bagimon-image.js';

const DEFAULT_BASE = 'https://bagimon.vercel.app';
const GREY = 0x8a8270;

interface PostDeps {
  channel: Pick<TextChannel, 'send'>;
}

export interface AnnouncerRunSummary {
  announced: number;
  failed: number;
}

export class DeathAnnouncer {
  constructor(
    private readonly client: Client,
    private readonly repo: BagimonRepository,
  ) {}

  async runOnce(): Promise<AnnouncerRunSummary> {
    let announced = 0;
    let failed = 0;
    let dead: Bagimon[];
    try {
      dead = await this.repo.findUnannouncedDeaths();
    } catch (err) {
      console.warn(
        `[DeathAnnouncer] findUnannouncedDeaths failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { announced: 0, failed: 0 };
    }

    for (const b of dead) {
      try {
        await this.announce(b);
        announced += 1;
      } catch (err) {
        console.warn(
          `[DeathAnnouncer] announcement failed for ${b.coin_mint}: ${err instanceof Error ? err.message : String(err)}`,
        );
        failed += 1;
      }
      // Either way, mark announced — we don't want to spam after a permanent
      // failure (e.g. kicked from server). Memorial page is the durable record.
      try {
        await this.repo.markDeathAnnounced(b.id);
      } catch (err) {
        console.warn(
          `[DeathAnnouncer] markDeathAnnounced failed for ${b.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    return { announced, failed };
  }

  private async announce(b: Bagimon): Promise<void> {
    // Web-spawned Bagimons have no Discord server to announce in.
    if (!b.discord_server_id) return;
    const guild = await this.client.guilds.fetch(b.discord_server_id);
    const channel = await pickAnnounceChannel(guild);
    if (!channel) throw new Error('no writable channel available');
    await postDeathEmbed(b, { channel });
  }
}

async function pickAnnounceChannel(guild: Guild): Promise<TextChannel | null> {
  const me = guild.members.me;
  if (!me) return null;
  const system = guild.systemChannel;
  if (system && system.permissionsFor(me).has('SendMessages')) return system;
  const channels = await guild.channels.fetch();
  for (const ch of channels.values()) {
    if (
      ch &&
      ch.type === ChannelType.GuildText &&
      ch.permissionsFor(me)?.has('SendMessages')
    ) {
      return ch as TextChannel;
    }
  }
  return null;
}

export async function postDeathEmbed(b: Bagimon, deps: PostDeps): Promise<void> {
  const config = await getTraitsConfig();
  const traits = traitsForMint(b.coin_mint, config);
  const species = findSpecies(config, traits.species);
  const symbol = b.coin_symbol ? `$${b.coin_symbol}` : 'Bagimon';
  const bornMs = Date.parse(b.born_at);
  const diedMs = b.died_at ? Date.parse(b.died_at) : Date.now();
  const lifespanDays = Math.max(0, Math.floor((diedMs - bornMs) / 86_400_000));
  const description = deathDescription(traits.species, symbol, lifespanDays);
  const base = (process.env.PETDEX_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, '');
  const url = `${base}/p/${b.id}`;

  const { attachment } = await renderBagimonAttachment(b.coin_mint, 'dying', 'bagimon-dying.png');
  const embed = new EmbedBuilder()
    .setTitle(`💀 In memoriam: ${symbol}`)
    .setURL(url)
    .setColor(GREY)
    .setDescription(description)
    .addFields(
      { name: 'Born', value: `<t:${Math.floor(bornMs / 1000)}:D>`, inline: true },
      { name: 'Died', value: `<t:${Math.floor(diedMs / 1000)}:D>`, inline: true },
      {
        name: 'Lifespan',
        value: `${lifespanDays} day${lifespanDays === 1 ? '' : 's'}`,
        inline: true,
      },
      { name: 'Final mood', value: b.final_mood ?? 'dying', inline: true },
      {
        name: 'Final 24h volume',
        value: formatUsd(b.final_volume24h_usd),
        inline: true,
      },
      { name: 'Species', value: species.displayName, inline: true },
    )
    .setImage('attachment://bagimon-dying.png')
    .setFooter({ text: `Their Petdex page remains as a memorial: ${url}` });

  await deps.channel.send({ embeds: [embed], files: [attachment] });
}

function deathDescription(species: string, symbol: string, days: number): string {
  switch (species) {
    case 'ghotosai':
      return `${symbol}, a Ghotosai spirit, has faded from the realm. It drifted in our channel for ${days} day${days === 1 ? '' : 's'} before going silent.`;
    case 'potatiki':
      return `${symbol}, a Potatiki, has gone back to soil. It tended these roots for ${days} day${days === 1 ? '' : 's'} before the harvest came.`;
    default:
      return `${symbol} is no longer with us. It lived for ${days} day${days === 1 ? '' : 's'}.`;
  }
}

function formatUsd(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toFixed(2)}`;
}
