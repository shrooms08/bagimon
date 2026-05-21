import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';
import type {
  BagimonRepository,
  BagimonParentsRepository,
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
import { handleExpedite } from './expedite.js';
import { handleFamily } from './family.js';
import type { MoodLoop } from '../mood-loop/index.js';

export interface CommandContext {
  moodLoop: MoodLoop;
  interactions: InteractionsRepository;
  aiCalls: AiCallsRepository;
  moodTransitions: MoodTransitionsRepository;
  parents: BagimonParentsRepository;
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
  )
  .addSubcommand((s) =>
    s
      .setName('family')
      .setDescription("Show this Bagimon's top 10 holders (its parents).")
      .addStringOption((o) => o.setName('mint').setDescription('Coin mint (optional if only one)')),
  );

if (process.env.ENABLE_EXPEDITE === 'true') {
  bagimonCommand.addSubcommand((s) =>
    s
      .setName('expedite')
      .setDescription('[dev] Backdate the dying streak so the next tick kills this Bagimon.')
      .addStringOption((o) => o.setName('mint').setDescription('Coin mint').setRequired(true)),
  );
}

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
      return handleRefresh(interaction, ctx.moodLoop, repo);
    case 'link':
      return handleLink(interaction, repo);
    case 'family':
      return handleFamily(interaction, repo, ctx.parents);
    case 'expedite':
      return handleExpedite(interaction, repo, ctx.moodTransitions);
    default:
      await interaction.reply({ content: `Unknown subcommand: ${sub}`, ephemeral: true });
  }
}
