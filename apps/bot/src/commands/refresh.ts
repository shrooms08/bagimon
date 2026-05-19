import type { ChatInputCommandInteraction } from 'discord.js';
import type { MoodLoop } from '../mood-loop/index.js';

const RATE_LIMIT_MS = 60_000;
const lastInvocation = new Map<string, number>();

export async function handleRefresh(
  interaction: ChatInputCommandInteraction,
  moodLoop: MoodLoop,
): Promise<void> {
  const userId = interaction.user.id;
  const now = Date.now();
  const last = lastInvocation.get(userId);
  if (last && now - last < RATE_LIMIT_MS) {
    const wait = Math.ceil((RATE_LIMIT_MS - (now - last)) / 1000);
    await interaction.reply({
      content: `:hourglass: Slow down — try again in ${wait}s.`,
      ephemeral: true,
    });
    return;
  }
  lastInvocation.set(userId, now);

  await interaction.deferReply({ ephemeral: true });
  const mint = interaction.options.getString('mint') ?? undefined;
  const summary = await moodLoop.runOnce(mint);
  await interaction.editReply({
    content:
      `:repeat: Mood loop tick complete\n` +
      `• evaluated: ${summary.evaluated}\n` +
      `• mood changes: ${summary.moodChanged}\n` +
      `• failed: ${summary.failed}\n` +
      `• duration: ${(summary.durationMs / 1000).toFixed(2)}s`,
  });
}
