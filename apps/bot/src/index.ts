import { Client, Events, GatewayIntentBits } from 'discord.js';
import { BagimonRepository, createServerClient } from '@bagimon/db';
import { loadConfig } from './config.js';
import { dispatchCommand } from './commands/index.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const supabase = createServerClient({
    url: config.SUPABASE_URL,
    key: config.SUPABASE_SERVICE_ROLE_KEY,
  });
  const repo = new BagimonRepository(supabase);

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once(Events.ClientReady, (c) => {
    console.info(`bagimon bot online as ${c.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    try {
      await dispatchCommand(interaction, repo);
    } catch (err) {
      console.error(`command ${interaction.commandName} failed:`, err);
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      const payload = { content: `:warning: ${message}`, ephemeral: true } as const;
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => undefined);
      } else {
        await interaction.reply(payload).catch(() => undefined);
      }
    }
  });

  await client.login(config.DISCORD_BOT_TOKEN);
}

main().catch((err: unknown) => {
  console.error('bot failed to start:', err);
  process.exit(1);
});
