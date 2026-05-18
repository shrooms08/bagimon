import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';
import type { BagimonRepository } from '@bagimon/db';
import { handleSpawn } from './spawn.js';
import { handleStats } from './stats.js';
import { handlePet } from './pet.js';
import { handleLore } from './lore.js';

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
  );

export const commandDefinitions: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
  bagimonCommand.toJSON(),
];

export async function dispatchCommand(
  interaction: ChatInputCommandInteraction,
  repo: BagimonRepository,
): Promise<void> {
  if (interaction.commandName !== 'bagimon') return;
  const sub = interaction.options.getSubcommand();
  switch (sub) {
    case 'spawn':
      return handleSpawn(interaction, repo);
    case 'stats':
      return handleStats(interaction, repo);
    case 'pet':
      return handlePet(interaction, repo);
    case 'lore':
      return handleLore(interaction, repo);
    default:
      await interaction.reply({ content: `Unknown subcommand: ${sub}`, ephemeral: true });
  }
}
