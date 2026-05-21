// @ts-check
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';

const here = dirname(fileURLToPath(import.meta.url));
// Web app reads from the repo-root .env (same as the bot) so we don't have
// to duplicate Supabase credentials in apps/web/.env.local.
loadDotenv({ path: resolve(here, '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
    // Next's file tracer can't see the runtime fs.readFile() calls that load
    // PNG layers from packages/art, so we tell it explicitly to bundle them
    // with the routes that need them. Paths are relative to the project root.
    outputFileTracingRoot: join(here, '../../'),
    outputFileTracingIncludes: {
      '/api/bagimon/[bagimonId]/image': ['../../packages/art/assets/**/*'],
      '/p/[bagimonId]/opengraph-image': ['../../packages/art/assets/**/*'],
    },
  },
  // Workspace packages use ESM-style `.js` extensions in their .ts imports.
  // Next's webpack needs an extensionAlias to resolve those to the .ts files.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
  // Make sure the workspace TS sources are transpiled by Next's pipeline.
  transpilePackages: ['@bagimon/shared', '@bagimon/db'],
};

export default nextConfig;
