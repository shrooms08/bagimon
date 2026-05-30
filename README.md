<div align="center">

# Bagimon

### A digital spirit for every coin on [Bags.fm](https://bags.fm)

Every Bags coin can adopt a hand-drawn pixel creature that lives in its community's Discord, reacts to live on-chain trading, and **dies permanently** if the community goes silent.

**[Live App](https://bagimon.vercel.app)** · **[See a live Bagimon](https://bagimon.vercel.app/p/3e8b7e93-0001-4b90-8533-3f2112851dd6)** · **[Install on Discord](https://bagimon.vercel.app)**

<img src="https://bagimon.vercel.app/p/3e8b7e93-0001-4b90-8533-3f2112851dd6/opengraph-image" alt="Bagimon Petdex card for $ELLIE" width="600" />

*Built for the Bags Hackathon · Q1 2026*

</div>

---

## The idea

Memecoins typically die within 48 hours of launch. When a coin dies, so does Bags' fee revenue from it.

Bagimon ties **coin survival to community engagement**. Each coin gets a creature whose mood reflects its real on-chain activity — volume, price, trader count. Trade and engage, and your Bagimon thrives. Go quiet, and it gets hungry, then sick, then dying. **Fourteen days of silence and it dies — permanently.** A memorial page lives on forever as a record that the coin once mattered.

Bagimon makes coins *feel like something*, and that turns trading from pure speculation into something closer to care.

> Each on-chain swap is a heartbeat.

---

## How it works

1. **Launch your coin on Bags** — every coin minted on Bags.fm can adopt a Bagimon.
2. **Add the bot to your Discord** — `/bagimon spawn` creates a unique creature for your coin. It lives in your community's server.
3. **Trade to keep it alive** — mood is tied to on-chain activity. Volume drops, the pet gets hungry. 14 days of silence and it dies, permanently.

Every Bagimon also gets a public **Petdex page** — a shareable profile with its sprite, live stats, mood history, the coin's top 10 holders (its "parents"), lifetime fees, and creator attribution.

---

## Features

- **Deterministic creatures** — a creature's species and traits are derived from a SHA-256 hash of its mint address, so every coin gets a unique, reproducible Bagimon.
- **Five mood states** — Happy, Thriving, Hungry, Sick, and Dying, each driven by live DEX metrics and rendered as a distinct hand-drawn sprite.
- **Permanent death + memorial pages** — death is irreversible. Memorial Petdex pages preserve a coin's final stats, family, and lifetime fees as a permanent record.
- **The parent system** — each Bagimon tracks its coin's top 10 holders as "parents," with daily snapshots and rank highlighting.
- **AI personality** — powered by Claude Haiku, each species has a distinct voice and short-term memory of recent interactions, so petting your Bagimon feels alive.
- **Shareable Petdex pages** — public profiles with auto-generated 1200×630 social-share cards that unfurl beautifully on Discord, Twitter, and anywhere a link is dropped.

---

## Built natively on Bags

Bagimon depends on Bags. It cannot function without it.

- **Lifetime fees** — every Petdex page surfaces the coin's total lifetime fees earned on Bags, pulled live via the Bags SDK (`getTokenLifetimeFees`).
- **Creator attribution** — Petdex pages display the coin's creator (social handle, profile picture, royalty share) via `getTokenCreators`.
- **Spawn validation** — `/bagimon spawn` validates that a mint is a real Bags coin before creating a creature. Non-Bags tokens are politely rejected. Bagimon literally won't work for coins that didn't launch on Bags.
- **Partner-key revenue alignment** *(roadmap)* — Bagimon's incentives align with Bags': as Bagimon extends coin lifespans, Bags earns more fees per launch. A "Launch with Bagimon" co-launch flow using the Bags partner-key fee-share system is on the roadmap.

All Bags data is synced on every mood-loop tick and cached, keeping Petdex pages fast and well within API rate limits.

---

## Architecture

A pnpm + Turborepo monorepo, TypeScript strict throughout.

| Package | Responsibility |
|---|---|
| `apps/bot` | Discord.js v14 bot — spawn, pet, stats, link, family, refresh commands |
| `apps/web` | Next.js 14 (App Router) — homepage, Petdex pages, OG image generation. Deployed on Vercel |
| `packages/shared` | Core types, Bagimon assembly, mood rules, death-check logic |
| `packages/db` | Supabase (Postgres) data layer with a repositories pattern |
| `packages/bags-api` | Bags SDK wrapper — lifetime fees, creator data, pool validation |
| `packages/coin-data` | DEX market data — DexScreener primary, Jupiter fallback |
| `packages/holder-data` | Top-10 holder snapshots via Helius RPC |
| `packages/ai` | Claude Haiku personality service with a rate limiter |
| `packages/art` | Hand-drawn pixel PNGs + the layer compositing assembler |

**Stack:** TypeScript · Discord.js · Next.js · Supabase · Solana · Helius · Bags SDK · Claude Haiku · Sharp · Vercel

---

## The mood engine

Mood is evaluated for every living Bagimon on a polling loop (every 30 minutes), based on live coin metrics:

| Mood | Condition |
|---|---|
| **Thriving** | High volume, strong price gain, many active buyers |
| **Happy** | Default healthy state |
| **Hungry** | Low trading volume — looking for attention |
| **Sick** | Price dropped hard |
| **Dying** | Near-zero volume and silence for several days |

A Bagimon that stays in the Dying state for 14 days dies permanently. Recovery is possible right up until that threshold — on-chain activity can lift a Bagimon back out of Dying. There is no revival after death; this is a deliberate design choice.

---

## Local development

> Requires Node.js, pnpm, and accounts/keys for Supabase, Helius, Anthropic (Claude), and a Bags API key.

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Fill in: DISCORD_BOT_TOKEN, SUPABASE_*, HELIUS_API_KEY,
#          ANTHROPIC_API_KEY, BAGS_API_KEY, and friends

# Run the web app
pnpm --filter @bagimon/web dev

# Run the Discord bot (separate terminal)
pnpm --filter @bagimon/bot deploy:commands
pnpm --filter @bagimon/bot dev
```

The web app reads art assets from `packages/art`, copied into `apps/web/public/_art` at build time. Database migrations live in `packages/db/migrations`.

---

## Roadmap

- **Telegram bot** — bring Bagimon to Telegram communities
- **More species** — expand the creature roster beyond Ghotosai and Potatiki
- **Animations** — idle cycles, mood transitions, and death/revival sequences
- **"Launch with Bagimon"** — co-launch flow with Bags partner-key fee sharing
- **Cross-coin lineage** — Bagimons that descend from other Bagimons
- **Sponsored species** — premium creature sets for partner communities
- **$BAGIMON** — a community token (deferred until post-hackathon)

---

## Hackathon

Built for **The Bags Hackathon (Q1 2026)**. Applying under:

- **Bags API** — live SDK integration on every Petdex page (lifetime fees, creators, validation)
- **AI Agents** — Claude-powered in-character creature personalities
- **Social Finance** — tying coin survival to community engagement

---

<div align="center">

**Powered by Bagimon**

[bagimon.vercel.app](https://bagimon.vercel.app) · [Bags.fm](https://bags.fm)

</div>
