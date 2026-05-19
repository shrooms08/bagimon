import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    server: {
      deps: {
        // 'server-only' is a Next.js marker module; bypass it in tests.
        inline: ['server-only'],
      },
    },
    alias: {
      'server-only': new URL('./src/__test-shims__/server-only.ts', import.meta.url).pathname,
    },
  },
});
