import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';
import type {
  BagimonRepository,
  InteractionsRepository,
  AiCallsRepository,
  MoodTransitionsRepository,
} from '@bagimon/db';
import type { PersonalityService } from '@bagimon/ai';
import { handleSpawn } from './spawn.js';
import { handleStats } from './stats.js';
import { handlePet } from './pet.js';
import { handleLore } from './lore.js';
import { handleRefresh } from './refresh.js';
import { handleLink } from './link.js';
import type { MoodLoop } from '../mood-loop/index.js';

export interface CommandContext {
  moodLoop: MoodLoop;
  interactions: InteractionsRepository;
  aiCalls: AiCallsRepository;
  moodTransitions: MoodTransitionsRepository;
  personality: PersonalityService;
}

export const bagimonCommand = new SlashCommandBuilder()
  .setName('bagimon')
  .setDescription('Interact with the Bagimon bound to a Bags.fm coin in this server.')
  .addSubcommand((s) =>
    s
      .setName('spawn')
      .setDescription('Spawn a new Bagimon for a Bags.fm coin mint.')
      .addStringOption((o) =>
        o.setName('mint').setDescription('Solana coin mint address').setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('stats')
      .setDescription("Show a Bagimon's mood, age, and parents.")
      .addStringOption((o) => o.setName('mint').setDescription('Coin mint (optional if only one)')),
  )
  .addSubcommand((s) =>
    s
      .setName('pet')
      .setDescription('Pet your Bagimon.')
      .addStringOption((o) => o.setName('mint').setDescription('Coin mint (optional if only one)')),
  )
  .addSubcommand((s) =>
    s
      .setName('lore')
      .setDescription("Read this Bagimon's origin story.")
      .addStringOption((o) => o.setName('mint').setDescription('Coin mint (optional if only one)')),
  )
  .addSubcommand((s) =>
    s
      .setName('refresh')
      .setDescription('Force a mood-loop tick now (rate limited).')
      .addStringOption((o) =>
        o.setName('mint').setDescription('Refresh only this coin mint (optional)'),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('link')
      .setDescription('Share the public Petdex page for this Bagimon.')
      .addStringOption((o) => o.setName('mint').setDescription('Coin mint (optional if only one)')),
  );

export const commandDefinitions: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
  bagimonCommand.toJSON(),
];

export async function dispatchCommand(
  interaction: ChatInputCommandInteraction,
  repo: BagimonRepository,
  ctx: CommandContext,
): Promise<void> {
  if (interaction.commandName !== 'bagimon') return;
  const sub = interaction.options.getSubcommand();
  switch (sub) {
    case 'spawn':
      return handleSpawn(interaction, repo);
    case 'stats':
      return handleStats(interaction, repo);
    case 'pet':
      return handlePet(interaction, {
        bagimons: repo,
        interactions: ctx.interactions,
        aiCalls: ctx.aiCalls,
        moodTransitions: ctx.moodTransitions,
        personality: ctx.personality,
      });
    case 'lore':
      return handleLore(interaction, repo);
    case 'refresh':
      return handleRefresh(interaction, ctx.moodLoop);
    case 'link':
      return handleLink(interaction, repo);
    default:
      await interaction.reply({ content: `Unknown subcommand: ${sub}`, ephemeral: true });
  }
}
