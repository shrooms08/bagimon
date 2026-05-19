import { describe, expect, it, vi } from 'vitest';
import { handleRefresh } from './refresh.js';
import type { MoodLoop, RunSummary } from '../mood-loop/index.js';
import type { ChatInputCommandInteraction } from 'discord.js';

function makeInteraction(opts: { userId: string; mint?: string }) {
  const reply = vi.fn(async () => undefined);
  const deferReply = vi.fn(async () => undefined);
  const editReply = vi.fn(async () => undefined);
  return {
    interaction: {
      user: { id: opts.userId },
      options: { getString: (name: string) => (name === 'mint' ? (opts.mint ?? null) : null) },
      reply,
      deferReply,
      editReply,
    } as unknown as ChatInputCommandInteraction,
    reply,
    deferReply,
    editReply,
  };
}

function makeLoop(summary: RunSummary) {
  const runOnce = vi.fn(async () => summary);
  return { loop: { runOnce } as unknown as MoodLoop, runOnce };
}

describe('handleRefresh', () => {
  it('runs the loop and reports the summary', async () => {
    const { loop, runOnce } = makeLoop({
      evaluated: 3,
      moodChanged: 1,
      failed: 0,
      durationMs: 1200,
    });
    const { interaction, editReply } = makeInteraction({ userId: `u-${Math.random()}` });
    await handleRefresh(interaction, loop);
    expect(runOnce).toHaveBeenCalledOnce();
    expect(editReply).toHaveBeenCalledOnce();
  });

  it('passes the mint argument through', async () => {
    const { loop, runOnce } = makeLoop({
      evaluated: 1,
      moodChanged: 0,
      failed: 0,
      durationMs: 100,
    });
    const { interaction } = makeInteraction({
      userId: `u-${Math.random()}`,
      mint: 'm-xyz',
    });
    await handleRefresh(interaction, loop);
    expect(runOnce).toHaveBeenCalledWith('m-xyz');
  });

  it('rate limits repeated invocations from the same user', async () => {
    const { loop, runOnce } = makeLoop({
      evaluated: 0,
      moodChanged: 0,
      failed: 0,
      durationMs: 1,
    });
    const userId = `u-${Math.random()}`;
    const first = makeInteraction({ userId });
    await handleRefresh(first.interaction, loop);
    const second = makeInteraction({ userId });
    await handleRefresh(second.interaction, loop);
    expect(runOnce).toHaveBeenCalledOnce();
    expect(second.reply).toHaveBeenCalledOnce();
  });
});
