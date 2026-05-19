import type { BagimonSupabaseClient } from '../client.js';

export interface AiCallLogEntry {
  bagimonId: string | null;
  discordUserId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsdEstimate: number;
  latencyMs: number;
  succeeded: boolean;
  fallbackReason?: string;
}

export class AiCallsRepository {
  constructor(private readonly client: BagimonSupabaseClient) {}

  async log(entry: AiCallLogEntry): Promise<void> {
    const { error } = await this.client.from('ai_calls').insert({
      bagimon_id: entry.bagimonId,
      discord_user_id: entry.discordUserId,
      model: entry.model,
      input_tokens: entry.inputTokens,
      output_tokens: entry.outputTokens,
      cost_usd_estimate: entry.costUsdEstimate,
      latency_ms: entry.latencyMs,
      succeeded: entry.succeeded,
      fallback_reason: entry.fallbackReason ?? null,
    });
    if (error) throw new Error(`failed to log ai_call: ${error.message}`);
  }

  async totalCostLast30Days(): Promise<number> {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data, error } = await this.client
      .from('ai_calls')
      .select('cost_usd_estimate')
      .gte('created_at', since);
    if (error) throw new Error(`failed to sum ai_calls: ${error.message}`);
    return (data ?? []).reduce((sum, row) => sum + Number(row.cost_usd_estimate ?? 0), 0);
  }
}
