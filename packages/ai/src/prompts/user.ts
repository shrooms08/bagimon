import type { PersonalityContext } from '../types.js';

function relativeAgo(now: number, at: Date): string {
  const ms = now - at.getTime();
  if (ms < 60_000) return 'just now';
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatUsdCompact(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toFixed(2)}`;
}

export function buildUserMessage(ctx: PersonalityContext, now: number = Date.now()): string {
  const lines: string[] = [];
  lines.push(`Someone named ${ctx.petterDisplayName} just pet you.`);

  const stateBits: string[] = [];
  if (ctx.coinSymbol) stateBits.push(`- Symbol: $${ctx.coinSymbol}`);
  if (ctx.priceChange24hPct != null && Number.isFinite(ctx.priceChange24hPct)) {
    const sign = ctx.priceChange24hPct > 0 ? '+' : '';
    stateBits.push(`- 24h price change: ${sign}${ctx.priceChange24hPct.toFixed(2)}%`);
  }
  if (ctx.volume24hUsd != null && Number.isFinite(ctx.volume24hUsd)) {
    stateBits.push(`- 24h volume: ${formatUsdCompact(ctx.volume24hUsd)}`);
  }
  if (ctx.recentMoodHistory.length > 0) {
    const recent = ctx.recentMoodHistory
      .slice(0, 3)
      .map((h) => `${h.mood} (${h.trigger}, ${relativeAgo(now, h.at)})`)
      .join(' → ');
    stateBits.push(`- Recent mood: ${recent}`);
  }
  if (stateBits.length > 0) {
    lines.push('', "Your coin's current state:", ...stateBits);
  }

  if (ctx.previousInteractions.length > 0) {
    lines.push('', 'Your memory of recent visits:');
    for (const v of ctx.previousInteractions.slice(0, 3)) {
      const trimmed = v.response.length > 140 ? `${v.response.slice(0, 140)}…` : v.response;
      lines.push(`- ${relativeAgo(now, v.at)}, ${v.petterDisplayName}: "${trimmed}"`);
    }
  }

  lines.push('', 'Respond as your character would. 1-2 short sentences.');
  return lines.join('\n');
}
