# Bagimon — Claude Code Project Context

> Read this file first. It is the single source of truth for what Bagimon is, what
> we're building, what's deferred, and how the code is laid out. Future Claude Code
> sessions should read this end-to-end before touching anything.

---

## 1. Project Vision

Bagimon is a Discord-first AI pet system layered on top of Bags.fm Solana coins.
Every coin that launches on Bags.fm can adopt a Bagimon — a hand-drawn pixel-art
creature that lives in the coin's Discord server, reacts in real time to on-chain
trading activity (buys, sells, volume, holder churn), has persistent memory of its
top holders (its "parents"), and can permanently die if the community lets the
coin go inactive. It's Pokemon × Tamagotchi × on-chain culture: a shared mascot
that gives a token community something to care about beyond price. Aimed at
Bags.fm coin creators and their Discord communities — the people who already have
a server and need a reason to keep it alive between trading spikes.

---

## 2. Hard Constraints

These are non-negotiable for v1. Don't propose architectures that violate them.

- **$0/month free tiers only.** Supabase free, Helius free, Fly.io free, Vercel
  hobby, Anthropic pay-as-you-go (kept under $5/mo via Haiku + tight prompts).
- **No X (Twitter) integration in v1.** API pricing is hostile. Discord only.
- **The `$BAGIMON` coin launch is deferred** until after winning a hackathon
  grant. Do not write code that assumes the coin exists, gates features behind
  holding it, or refers to tokenomics. Treat it as a future Phase 7+ concern.
- **Total monthly operational cost ceiling: under $5.** Anthropic spend is the
  only real variable — design prompts and caching with that in mind.
- **Discord-native, not a web app pretending to be one.** The web Petdex is a
  read-only showcase. All real interaction happens in Discord.

---

## 3. Build Phases

The project is sequenced as seven phases. Don't skip ahead — each phase builds on
the previous one, and the constraints of later phases inform earlier decisions.

- **Phase 0 — Scaffold** (this commit): monorepo, tooling, CLAUDE.md, empty
  package skeletons. No business logic.
- **Phase 1 — Art generator**: hand-drawn Pixelorama PNG layers in
  `packages/art`, plus the deterministic assembly function in
  `packages/shared` that turns a coin mint address into a unique Bagimon by
  composing layers. Output: a PNG of any creature given a mint.
- **Phase 2 — Bot skeleton**: `apps/bot` boots, connects to Discord, registers
  slash commands (`/adopt`, `/feed`, `/check`, `/petdex`), reads/writes to
  Supabase. Schema is created here.
- **Phase 3 — Webhooks**: Helius webhooks pipe Bags.fm trading activity into a
  webhook handler (likely a Next.js route in `apps/web` or a small Fly endpoint),
  which updates the Bagimon's state in Supabase.
- **Phase 4 — Personality**: Anthropic Claude Haiku
  (`claude-haiku-4-5-20251001`) generates pet responses to slash commands, with
  prompt context including current mood, recent trades, and remembered parents.
- **Phase 5 — Petdex web**: `apps/web` ships a public Next.js site listing all
  adopted Bagimon, their current mood, top holders, and individual creature
  pages. Read-only, statically rendered where possible.
- **Phase 6 — Death + parents**: 14-day inactivity death mechanic, public
  memorial pages, and the "parents" persistent-memory layer that remembers a
  Bagimon's top holders across sessions.

---

## 4. Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Language**: TypeScript everywhere, strict mode, no `any`
- **Discord bot**: discord.js v14, Node 20 runtime, hosted on Fly.io free tier
- **Web**: Next.js 14 (App Router), Tailwind CSS, hosted on Vercel hobby
- **Database**: Supabase (Postgres + auth eventually), free tier
- **On-chain data**: Helius webhooks + Helius RPC, free tier
- **AI**: Anthropic SDK using `claude-haiku-4-5-20251001` (Haiku 4.5)
- **Art**: Hand-drawn in Pixelorama, exported as PNG layers
- **Lint/format**: ESLint + Prettier, opinionated and minimal

Versions are pinned in each `package.json`. Dependencies will be installed
phase-by-phase, not all upfront.

---

## 5. Repo Layout

```
Bagimon/
├── apps/
│   ├── bot/                 # Discord bot — discord.js, Node 20, Fly.io target
│   └── web/                 # Next.js 14 Petdex public site, Vercel target
├── packages/
│   ├── shared/              # Shared types, enums, constants, pure utility fns
│   │                        # (Bagimon assembly logic, mood transitions live here)
│   ├── db/                  # Supabase client + generated DB types
│   ├── coin-data/           # DexScreener / Jupiter / Helius fetchers + CoinStatsService
│   └── art/                 # Hand-drawn Pixelorama PNG assets + assembly metadata
│       ├── assets/          # Raw PNG layers (body, eyes, mouth, accessories)
│       └── metadata/        # JSON describing layer composition rules
├── CLAUDE.md                # This file
├── README.md                # One-liner + pointer to this file
├── package.json             # Root workspace
├── pnpm-workspace.yaml      # pnpm workspace config
├── turbo.json               # Turborepo pipeline config
├── tsconfig.base.json       # Shared TS config, extended by every package
├── .env.example             # Required env vars (copy to .env to fill in)
├── .gitignore
├── .prettierrc.json
├── .prettierignore
└── .eslintrc.json
```

---

## 6. Code Conventions

- **TypeScript strict mode** everywhere. `strict: true`, `noImplicitAny: true`,
  `noUncheckedIndexedAccess: true`. No escape hatches.
- **No `any`.** ESLint enforces this. Use `unknown` + narrowing, or write the
  type. If you genuinely need an escape hatch, write a comment justifying it.
- **Prefer functional patterns.** Pure functions, immutable data, no classes
  unless a library forces it (discord.js Client, Supabase client). No OOP
  ceremony for its own sake.
- **All DB access goes through `packages/db`.** Never instantiate a Supabase
  client outside that package. The bot and web app import a configured client.
- **All shared logic goes through `packages/shared`.** Bagimon assembly, mood
  state transitions, trait derivation, mint-to-traits hashing — all live there
  and are pure. Both `apps/bot` and `apps/web` consume them.
- **No business logic in `apps/web` route handlers.** Route handlers parse the
  request, call into `packages/shared` or `packages/db`, return the response.
  Same rule for Discord command handlers in `apps/bot` — they're thin adapters.
- **Imports**: use workspace protocol (`workspace:*`) for internal packages.
- **Files**: kebab-case for filenames, PascalCase for React components.
- **Comments**: only when the *why* is non-obvious. Don't narrate the code.
- **A Bagimon's identity is (species, accessory). Mood is runtime state, not
  identity. Identity is derived deterministically from the coin mint — never
  randomize at runtime. The mint IS the seed.**
- **Species are hand-drawn full-character sprites with 5 mood variants each.
  Mood is baked into the species drawing, not applied as an overlay.**
- **Canvas size is 64×64 (changed from 256×256 in Phase 1).**
- **Seed byte budget: 0–3 species, 4–7 accessory-skip roll, 8–11 accessory,
  12–31 RESERVED for future trait categories — do not consume without a
  migration plan for existing Bagimons.**
- **Current species: `ghotosai`, `potatiki`. Add more by dropping a folder
  under `packages/art/assets/species/<id>/` with the 5 required mood PNGs
  and registering the species in `packages/art/metadata/traits.json` plus
  the `SpeciesId` union in `@bagimon/shared`'s `types.ts`.**
- **All trait-selection logic lives in `packages/shared/src/bagimon/`. Never
  duplicate this logic in `apps/bot` or `apps/web`.**
- **All DB access goes through `BagimonRepository` (and future repositories
  in `packages/db`) — never write Supabase queries directly in Discord
  command handlers or Next.js route handlers.**

---

## 7. The Five Mood States

A Bagimon is always in exactly one mood. Transitions are driven by on-chain
activity on the linked Bags.fm coin, evaluated on a rolling window. Exact
thresholds are tunable and will be refined in Phase 3/4. Sketch:

- **Happy** — default healthy state. Steady buy/sell flow, no extremes. Holders
  are stable, volume is in a normal band for the coin's size.
- **Hungry** — trading volume has dropped meaningfully (e.g. < 30% of the
  trailing 7-day average) but not catastrophically. The pet wants attention; a
  `/feed` from a holder (or a trade) restores it.
- **Sick** — net sell pressure is dominant: holder count shrinking, sell volume
  > buy volume across the recent window. Pet looks visibly worse. Recoverable
  with sustained buy pressure.
- **Thriving** — surge state. Strong net buy pressure, growing holder count,
  volume well above trailing average. Pet looks vibrant; rarer cosmetic
  variants may surface here.
- **Dying** — terminal countdown. Triggered when trading volume falls below a
  death threshold (near-zero) for several consecutive days. The pet visibly
  decays day-by-day. Recoverable up to day 14; after that, see §8.

State is recomputed on each on-chain event (Phase 3 webhook) and on a periodic
sweep for inactivity (no events is itself a signal — most importantly for
Dying). Transitions are logged to Supabase for the Petdex history view.

---

## 8. The Death Mechanic

If a Bagimon stays in **Dying** for 14 consecutive days — meaning trading
volume on the linked coin remains below the death threshold for that entire
window — the Bagimon **permanently dies**. Death is irreversible by design.

A dead Bagimon:

- Is removed from active Discord interactions (slash commands return a
  memorial response, not a personality response).
- Gets a permanent memorial page on the Petdex showing its lifespan, top
  parents, peak mood, last words (a final Haiku-generated line), and the
  coin it was bound to.
- Cannot be re-adopted. A new Bagimon for the same coin is a different
  creature.

Death is the load-bearing emotional mechanic. The art, the memory of parents,
and the public memorial together make abandonment feel like a real loss.
Don't soften it without explicit discussion.

---

## 9. Pet Personality

The vibe is **cute, earnest, slightly chaotic** — Pokemon and Tamagotchi
energy, not corporate-mascot energy. The pet:

- Responds in Discord through slash commands (`/check`, `/feed`, `/talk`, etc.).
  Exact command set lands in Phase 2.
- Speaks in short, warm, character-driven lines generated by Claude Haiku
  (`claude-haiku-4-5-20251001`). System prompts include the pet's current
  mood, recent on-chain events, and its remembered parents.
- Has **persistent memory of its top holders ("parents")** — wallet addresses
  with the largest sustained holdings get recognized by name (or by an
  abbreviated wallet) and treated as family. Memory persists across sessions
  via Supabase.
- Reacts to mood: a Hungry pet whines, a Thriving pet boasts, a Dying pet
  says goodbye. Tone shifts with state.

Keep Anthropic costs tiny: short prompts, aggressive system-prompt caching,
strict max-output-token limits.

---

## 10. Out of Scope for v1

Do not propose, design, or build any of these in v1. If a request implies one
of these, push back and ask before doing anything:

- **X (Twitter) integration.** API costs make this a Phase 7+ concern.
- **Egg / reproduction mechanics.** Bagimon do not breed in v1.
- **Sub-token launches** or any feature that mints/spawns new tokens from a
  Bagimon.
- **Premium tiers, paid features, subscriptions.** Free for everyone in v1.
- **The `$BAGIMON` coin itself.** Deferred until after a hackathon grant. No
  tokenomics, no holder gating, no airdrop logic.
- **Mobile app, browser extension, native client.** Discord + web only.

---

## 11. Cost Ceiling

Target total monthly operational cost: **under $5 USD**. The only variable
expense is Anthropic API usage. Everything else (Supabase, Helius, Fly.io,
Vercel) is on free tiers and stays there for v1.

Practical implications:

- Keep Haiku prompts short and cache aggressively.
- Cap output tokens per response (a Bagimon line is one or two sentences,
  not a paragraph).
- Don't call the model on every webhook event — batch or threshold updates.
- If we approach the ceiling, reduce response richness before increasing
  spend. Cost is a feature.

---

## 12. Phase Progress

- ✅ **Phase 0 — Scaffold** — pnpm/Turborepo monorepo, TS strict, CLAUDE.md,
  empty package skeletons.
- ✅ **Phase 1 — Art generator** — hand-drawn Pixelorama PNG layers in
  `packages/art`, deterministic mint-to-traits + layer composition in
  `packages/shared` (assemble.ts, traits.ts, hash.ts), CLI generator that turns
  any mint into a PNG.
- ✅ **Phase 2 — Bot skeleton + DB schema** — Supabase migration
  (`bagimons`, `mood_transitions`, `bagimon_parents`), `@bagimon/db` with
  typed client + `BagimonRepository`, Discord bot with `/bagimon spawn|stats|pet|lore`
  subcommands. `/bagimon spawn` writes to Supabase and replies with a real
  generated Bagimon PNG. Other commands run against stubbed data until
  Phase 3 wires live coin info.
- ✅ **Phase 2.5 — Species refactor + real art** — trait model switched from
  parts-based (body/eyes/mouth) to species + mood + accessory. Canvas 64×64.
  Real hand-drawn `ghotosai` and `potatiki` sprites imported with 5 mood
  variants each; 3 accessories (`eyepatch`, `glasses`, `partyhat`). Importer
  script (`pnpm --filter @bagimon/art import`) copies + downscales from
  source assets. Migration `0002_phase_2_5_wipe.sql` wipes the pre-2.5 row.
- ✅ **Phase 3 — Live coin data + mood transitions** — `@bagimon/coin-data`
  package with `DexScreenerFetcher` (primary), `JupiterFetcher` (price-only
  fallback), and `HeliusFetcher` (stub for Phase 6). `CoinStatsService`
  orchestrates the fallback chain with a 60s in-memory cache. Pure
  `computeMood` rules engine in `@bagimon/shared` with tunable thresholds
  in `MOOD_THRESHOLDS`. `MoodLoop` polls every 30 min from inside the
  Discord bot process, recomputes mood per alive Bagimon, persists
  `mood_transitions` rows on change, and caches latest stats on `bagimons`
  via migration `0003_add_coin_stats_columns.sql`. New `/bagimon refresh`
  triggers a tick on demand (rate limited per user). `/bagimon stats`
  embed now shows symbol, 24h price change %, 24h volume, and last-updated
  timestamp. `/bagimon pet` picks species-specific lines ~30% of the time.
- **Mood thresholds are tunable constants in
  `packages/shared/src/bagimon/mood-rules.ts`. Adjust as we observe real
  Bags.fm coin behavior — don't bake them into business logic elsewhere.**
- ✅ **Phase 5 — Petdex web** — `apps/web` Next.js 14 (App Router) site
  with a public Petdex page at `/p/[bagimonId]`. RSC fetches data via
  Supabase anon key + RLS (migration `0005_public_read_rls.sql` opens
  read-only access to bagimons, interactions, mood_transitions,
  bagimon_parents — `ai_calls` stays service-role only). Five
  hand-crafted CSS palettes swap via `data-mood` on a page wrapper.
  Bagimon PNGs render on-demand at `/api/bagimon/[id]/image` (1h
  cached) by reusing `assembleBagimon`; OG cards at
  `/p/[id]/opengraph-image` via `next/og`. `SPECIES_TYPE` map added to
  `@bagimon/shared`. New `/bagimon link` slash command posts the
  public URL with an embed Discord/Twitter unfurls. Homepage is a
  minimal pixel splash with an install CTA. CSS Modules per component
  — no Tailwind.

## 13. Discord bot operations

- **Deploy slash commands** (run once per command change): from repo root,
  `pnpm --filter @bagimon/bot deploy:commands`. Reads `DISCORD_BOT_TOKEN` and
  `DISCORD_CLIENT_ID` from `.env`. Global registration; can take up to an
  hour to appear in clients.
- **Run locally**: `pnpm --filter @bagimon/bot dev` (tsx watch).
- **Build for prod**: `pnpm --filter @bagimon/bot build` then `pnpm --filter @bagimon/bot start`.
- **Invite to a server**: see `apps/bot/README.md` for OAuth scopes/permissions.
- **Logs**: stdout — `console.info` for lifecycle, `console.error` for failed
  commands. Failed commands also reply to the user ephemerally with the error
  message so dev iteration is tight.

---

*Last updated: Phase 5. Update this file whenever a phase completes
or a core assumption changes.*
