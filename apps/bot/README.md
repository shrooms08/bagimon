# @bagimon/bot

The Discord-side of Bagimon. discord.js v14, Node 20, deploys to Fly.io.

## 1. Create a Discord application + bot

1. Go to https://discord.com/developers/applications → **New Application**.
2. Name it (e.g. `Bagimon dev`).
3. Sidebar → **Bot** → **Reset Token** → copy. This is `DISCORD_BOT_TOKEN`.
4. Sidebar → **General Information** → copy **Application ID**. This is
   `DISCORD_CLIENT_ID`.
5. **Privileged Gateway Intents**: leave them off. We only need Guilds.

Put both values in the repo-root `.env` (copy from `.env.example`).

## 2. Apply the Supabase migration

The bot won't function without the schema:

1. Open the Supabase dashboard → SQL Editor → **New query**.
2. Paste `packages/db/migrations/0001_initial.sql`.
3. Run. Confirm under Table Editor that `bagimons`, `mood_transitions`,
   `bagimon_parents` all exist.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` go into `.env`.

## 3. Invite the bot to a test server

Build an OAuth2 install URL:

- Scopes: `bot`, `applications.commands`
- Bot permissions: **Send Messages**, **Attach Files**, **Use Slash
  Commands**, **Embed Links** (262144 + 2048 + 32768 + 16384 = 313856 — or
  just tick them in the Developer Portal's OAuth2 URL generator)

Quick template (replace `YOUR_CLIENT_ID`):

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=313856&scope=bot+applications.commands
```

Open it, pick your test server, **Authorize**.

## 4. Deploy slash commands

From the repo root, after `pnpm install`:

```
pnpm --filter @bagimon/bot deploy:commands
```

Global commands can take up to an hour to propagate.

### Development tip: guild-only registration

For instant iteration during development, set `DISCORD_DEV_GUILD_ID` in
`.env` to the ID of your test server (enable Developer Mode in Discord,
right-click the server icon → **Copy Server ID**). When that var is set,
`deploy:commands` registers commands **only to that guild** and they appear
immediately — no hour-long wait.

- `DISCORD_DEV_GUILD_ID` set → guild-only registration (instant, dev mode)
- `DISCORD_DEV_GUILD_ID` unset or empty → global registration (up to 1 hour)

To switch back to global registration (e.g. before shipping), comment out
or remove the line and re-run `pnpm --filter @bagimon/bot deploy:commands`.
Note: switching modes does not auto-clean the other scope — guild and
global command sets are independent.

## 5. Run locally

```
pnpm --filter @bagimon/bot dev
```

Then in your test server:

- `/bagimon spawn mint:<some-solana-mint>` → generates and posts a Bagimon PNG.
- `/bagimon stats` → shows mood/age/parents.
- `/bagimon pet` → ephemeral pet response.
- `/bagimon lore` → ephemeral origin story.

## Production

```
pnpm --filter @bagimon/bot build
pnpm --filter @bagimon/bot start
```

Fly.io deployment lands in a later phase.
