import Anthropic from '@anthropic-ai/sdk';
import type { HaikuCallInput, HaikuCallResult } from './types.js';

export const HAIKU_MODEL = 'claude-haiku-4-5';
const DEFAULT_MAX_TOKENS = 100;
const DEFAULT_TEMPERATURE = 0.9;
const DEFAULT_TIMEOUT_MS = 8_000;

// Created lazily so importing this module doesn't require ANTHROPIC_API_KEY.
let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (!cachedClient) cachedClient = new Anthropic();
  return cachedClient;
}

export async function callHaiku(input: HaikuCallInput): Promise<HaikuCallResult> {
  const client = getClient();
  const response = await client.messages.create(
    {
      model: HAIKU_MODEL,
      max_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      system: input.systemPrompt,
      messages: [{ role: 'user', content: input.userMessage }],
    },
    { timeout: DEFAULT_TIMEOUT_MS },
  );

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  if (!text) {
    throw new Error('haiku returned empty text');
  }

  return {
    text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
