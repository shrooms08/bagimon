import { buildSystemPrompt } from './prompts/system.js';
import { buildUserMessage } from './prompts/user.js';
import { callHaiku, HAIKU_MODEL } from './haiku-client.js';
import { estimateCostUsd } from './cost-tracker.js';
import { RateLimiter } from './rate-limiter.js';
import type {
  FallbackProvider,
  HaikuCaller,
  PersonalityContext,
  PersonalityResponse,
} from './types.js';

const MAX_TOTAL_TOKENS = 1500;

export interface PersonalityServiceOptions {
  userBagimonLimiter: RateLimiter;
  bagimonLimiter: RateLimiter;
  fallbackProvider: FallbackProvider;
  apiKeyPresent?: () => boolean;
  haikuCaller?: HaikuCaller;
  logger?: (event: PersonalityLogEvent) => void;
}

export interface PersonalityLogEvent {
  bagimonId: string;
  userId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsdEstimate: number;
  latencyMs: number;
  succeeded: boolean;
  fallbackReason?: string;
}

export class PersonalityService {
  private readonly userBagimonLimiter: RateLimiter;
  private readonly bagimonLimiter: RateLimiter;
  private readonly fallbackProvider: FallbackProvider;
  private readonly apiKeyPresent: () => boolean;
  private readonly haikuCaller: HaikuCaller;
  private readonly logger?: (event: PersonalityLogEvent) => void;

  constructor(opts: PersonalityServiceOptions) {
    this.userBagimonLimiter = opts.userBagimonLimiter;
    this.bagimonLimiter = opts.bagimonLimiter;
    this.fallbackProvider = opts.fallbackProvider;
    this.apiKeyPresent = opts.apiKeyPresent ?? (() => Boolean(process.env.ANTHROPIC_API_KEY));
    this.haikuCaller = opts.haikuCaller ?? callHaiku;
    if (opts.logger) this.logger = opts.logger;
  }

  async generate(ctx: PersonalityContext, userId: string): Promise<PersonalityResponse> {
    const start = Date.now();
    const fallback = (reason: string): PersonalityResponse => {
      const latencyMs = Date.now() - start;
      this.log({
        bagimonId: ctx.bagimonId,
        userId,
        model: HAIKU_MODEL,
        inputTokens: 0,
        outputTokens: 0,
        costUsdEstimate: 0,
        latencyMs,
        succeeded: false,
        fallbackReason: reason,
      });
      return {
        text: this.fallbackProvider(ctx),
        source: 'fallback',
        cost: null,
        latencyMs,
        fallbackReason: reason,
      };
    };

    if (!this.apiKeyPresent()) {
      return fallback('missing_api_key');
    }

    const userKey = `${userId}:${ctx.bagimonId}`;
    if (!this.userBagimonLimiter.isAllowed(userKey)) {
      return fallback('rate_limit_user');
    }
    if (!this.bagimonLimiter.isAllowed(ctx.bagimonId)) {
      return fallback('rate_limit_bagimon');
    }

    const systemPrompt = buildSystemPrompt({
      species: ctx.species,
      mood: ctx.mood,
      coinSymbol: ctx.coinSymbol,
    });
    const userMessage = buildUserMessage(ctx);

    try {
      const result = await this.haikuCaller({ systemPrompt, userMessage, maxTokens: 100 });
      const totalTokens = result.inputTokens + result.outputTokens;
      if (totalTokens > MAX_TOTAL_TOKENS) {
        return fallback('token_budget_exceeded');
      }
      this.userBagimonLimiter.record(userKey);
      this.bagimonLimiter.record(ctx.bagimonId);
      const usdEstimate = estimateCostUsd(result.inputTokens, result.outputTokens);
      const latencyMs = Date.now() - start;
      this.log({
        bagimonId: ctx.bagimonId,
        userId,
        model: HAIKU_MODEL,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsdEstimate: usdEstimate,
        latencyMs,
        succeeded: true,
      });
      return {
        text: result.text,
        source: 'haiku',
        cost: {
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          usdEstimate,
        },
        latencyMs,
      };
    } catch (err) {
      const reason = err instanceof Error ? `api_error:${err.message.slice(0, 80)}` : 'api_error';
      return fallback(reason);
    }
  }

  private log(event: PersonalityLogEvent): void {
    if (this.logger) {
      try {
        this.logger(event);
      } catch {
        // logger failures must never break the user-facing path
      }
    }
  }
}
