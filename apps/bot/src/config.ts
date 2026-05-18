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
