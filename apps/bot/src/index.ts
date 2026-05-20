import { Client, Events, GatewayIntentBits } from 'discord.js';
import {
  AiCallsRepository,
  BagimonRepository,
  InteractionsRepository,
  MoodTransitionsRepository,
  createServerClient,
} from '@bagimon/db';
import {
  CoinStatsService,
  DexScreenerFetcher,
  JupiterFetcher,
  HeliusFetcher,
} from '@bagimon/coin-data';
import { PersonalityService, RateLimiter } from '@bagimon/ai';
import { loadConfig } from './config.js';
import { dispatchCommand } from './commands/index.js';
import { MoodLoop } from './mood-loop/index.js';
import { DeathAnnouncer } from './death-announcer/index.js';
import { genericFallback } from './commands/pet.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const supabase = createServerClient({
    url: config.SUPABASE_URL,
    key: config.SUPABASE_SERVICE_ROLE_KEY,
  });
  const repo = new BagimonRepository(supabase);
  const interactionsRepo = new InteractionsRepository(supabase);
  const aiCallsRepo = new AiCallsRepository(supabase);
  const moodTransitionsRepo = new MoodTransitionsRepository(supabase);

  if (!config.ANTHROPIC_API_KEY) {
    console.warn(
      '[ai] ANTHROPIC_API_KEY not set — /bagimon pet will fall back to canned lines.',
    );
  }

  const HOUR_MS = 60 * 60 * 1000;
  const personality = new PersonalityService({
    userBagimonLimiter: new RateLimiter(config.AI_RATE_LIMIT_USER_PER_HOUR, HOUR_MS),
    bagimonLimiter: new RateLimiter(config.AI_RATE_LIMIT_BAGIMON_PER_HOUR, HOUR_MS),
    fallbackProvider: genericFallback,
    logger: (event) => {
      // Audit log goes to DB via the pet command. Console line is for live tail.
      console.info(
        `[ai] bg=${event.bagimonId} user=${event.userId} succ=${event.succeeded} ` +
          `in=${event.inputTokens} out=${event.outputTokens} $${event.costUsdEstimate.toFixed(6)} ` +
          `t=${event.latencyMs}ms${event.fallbackReason ? ` reason=${event.fallbackReason}` : ''}`,
      );
    },
  });

  const coinStats = new CoinStatsService([
    new DexScreenerFetcher(),
    new JupiterFetcher(),
    new HeliusFetcher(config.HELIUS_API_KEY),
  ]);

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  const deathAnnouncer = new DeathAnnouncer(client, repo);

  const moodLoop = new MoodLoop(repo, coinStats, {
    intervalMs: config.MOOD_LOOP_INTERVAL_MINUTES * 60 * 1000,
    concurrency: config.MOOD_LOOP_CONCURRENCY,
    deathDaysThreshold: config.DEATH_DAYS_THRESHOLD,
    moodTransitions: moodTransitionsRepo,
    onDeath: async () => {
      // Best-effort kick of the announcer right after a death — fall-back
      // interval below catches anything we miss here.
      await deathAnnouncer.runOnce();
    },
  });

  const ANNOUNCER_INTERVAL_MS = 5 * 60 * 1000;
  let announcerTimer: NodeJS.Timeout | null = null;

  client.once(Events.ClientReady, (c) => {
    console.info(`bagimon bot online as ${c.user.tag}`);
    moodLoop.start();
    console.info(
      `[MoodLoop] started: interval=${config.MOOD_LOOP_INTERVAL_MINUTES}m concurrency=${config.MOOD_LOOP_CONCURRENCY} deathDays=${config.DEATH_DAYS_THRESHOLD}`,
    );
    void deathAnnouncer.runOnce();
    announcerTimer = setInterval(() => void deathAnnouncer.runOnce(), ANNOUNCER_INTERVAL_MS);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    try {
      await dispatchCommand(interaction, repo, {
        moodLoop,
        interactions: interactionsRepo,
        aiCalls: aiCallsRepo,
        moodTransitions: moodTransitionsRepo,
        personality,
      });
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

  const shutdown = async (signal: string) => {
    console.info(`received ${signal}, shutting down`);
    moodLoop.stop();
    if (announcerTimer) clearInterval(announcerTimer);
    client.destroy();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await client.login(config.DISCORD_BOT_TOKEN);
}

main().catch((err: unknown) => {
  console.error('bot failed to start:', err);
  process.exit(1);
});
