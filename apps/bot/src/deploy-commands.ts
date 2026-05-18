import { REST, Routes } from 'discord.js';
import { loadConfig } from './config.js';
import { commandDefinitions } from './commands/index.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const rest = new REST({ version: '10' }).setToken(config.DISCORD_BOT_TOKEN);
  const devGuildId = config.DISCORD_DEV_GUILD_ID;

  const route = devGuildId
    ? Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, devGuildId)
    : Routes.applicationCommands(config.DISCORD_CLIENT_ID);

  if (devGuildId) {
    console.info(
      `registering ${commandDefinitions.length} command(s) to guild ${devGuildId} (instant update)…`,
    );
  } else {
    console.info(`registering ${commandDefinitions.length} command(s) globally…`);
  }

  const result = (await rest.put(route, { body: commandDefinitions })) as readonly {
    name: string;
  }[];

  const suffix = devGuildId
    ? `(guild mode: ${devGuildId})`
    : '(global — may take up to 1 hour to appear)';
  for (const r of result) {
    console.info(`registered: ${r.name} ${suffix}`);
  }
}

main().catch((err: unknown) => {
  console.error('deploy-commands failed:', err);
  process.exit(1);
});
