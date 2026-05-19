// Haiku 4.5 token prices (USD per million tokens). Keep these aligned with
// Anthropic's posted pricing; cost is a hard ceiling in this project.
export const HAIKU_INPUT_USD_PER_MTOK = 1.0;
export const HAIKU_OUTPUT_USD_PER_MTOK = 5.0;

export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * HAIKU_INPUT_USD_PER_MTOK +
    (outputTokens / 1_000_000) * HAIKU_OUTPUT_USD_PER_MTOK
  );
}
