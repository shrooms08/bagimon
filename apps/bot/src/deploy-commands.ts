import { REST, Routes } from 'discord.js';
import { loadConfig } from './config.js';
import { commandDefinitions } from './commands/index.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const rest = new REST({ version: '10' }).setToken(config.DISCORD_BOT_TOKEN);
  console.info(`registering ${commandDefinitions.length} command(s) globally…`);
  const result = (await rest.put(Routes.applicationCommands(config.DISCORD_CLIENT_ID), {
    body: commandDefinitions,
  })) as readonly { name: string }[];
  console.info(`registered: ${result.map((r) => r.name).join(', ')}`);
  console.info('Global commands can take up to an hour to appear. For dev, use guild commands.');
}

main().catch((err: unknown) => {
  console.error('deploy-commands failed:', err);
  process.exit(1);
});
