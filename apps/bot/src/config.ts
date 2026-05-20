import { config as loadDotenv } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// .env lives at the repo root; apps/bot/src → repo root is ../../..
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
loadDotenv({ path: resolve(repoRoot, '.env') });

const ConfigSchema = z.object({
  DISCORD_BOT_TOKEN: z.string().min(1, 'DISCORD_BOT_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  DISCORD_DEV_GUILD_ID: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  HELIUS_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  MOOD_LOOP_INTERVAL_MINUTES: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v || v.length === 0) return 30;
      const n = Number(v);
      if (!Number.isInteger(n) || n <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'MOOD_LOOP_INTERVAL_MINUTES must be a positive integer',
        });
        return z.NEVER;
      }
      return n;
    }),
  MOOD_LOOP_CONCURRENCY: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v || v.length === 0) return 5;
      const n = Number(v);
      if (!Number.isInteger(n) || n <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'MOOD_LOOP_CONCURRENCY must be a positive integer',
        });
        return z.NEVER;
      }
      return n;
    }),
  ANTHROPIC_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  AI_RATE_LIMIT_USER_PER_HOUR: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v || v.length === 0) return 3;
      const n = Number(v);
      if (!Number.isInteger(n) || n <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'AI_RATE_LIMIT_USER_PER_HOUR must be a positive integer',
        });
        return z.NEVER;
      }
      return n;
    }),
  DEATH_DAYS_THRESHOLD: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v || v.length === 0) return 14;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'DEATH_DAYS_THRESHOLD must be >= 0.01',
        });
        return z.NEVER;
      }
      return n;
    }),
  ENABLE_EXPEDITE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  AI_RATE_LIMIT_BAGIMON_PER_HOUR: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v || v.length === 0) return 20;
      const n = Number(v);
      if (!Number.isInteger(n) || n <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'AI_RATE_LIMIT_BAGIMON_PER_HOUR must be a positive integer',
        });
        return z.NEVER;
      }
      return n;
    }),
});

export type BotConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(): BotConfig {
  const parsed = ConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    console.error(`Invalid bot environment:\n${issues}`);
    process.exit(1);
  }
  return parsed.data;
}
