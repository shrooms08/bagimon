# @bagimon/art

Hand-drawn pixel-art assets (Pixelorama PNGs) plus the assembly metadata the bot
and web app read to render a Bagimon.

Layout (post Phase 2.5):

- `assets/species/<species>/<mood>.png` — full-character 64×64 sprite per mood
  (`happy`, `hungry`, `sick`, `thriving`, `dying`). Mood is baked into the
  drawing, not applied as an overlay.
- `assets/accessories/<id>.png` — 64×64 swappable accessory.
- `metadata/traits.json` — species + accessory registry consumed by
  `@bagimon/shared`.

## Importing source art

```
BAGIMON_SOURCE_ASSETS_DIR=/path/to/bagimon-assets pnpm --filter @bagimon/art import
```

Defaults to `/Users/minos/Documents/bagimon-assets`. The importer copies only
the exported PNGs (ignores `pixelorama-file/` and `.pxo` sources), renames
`sadGhost.png` → `sad.png` for ghotosai, and warns on missing files or wrong
dimensions.

## Adding a new species

1. Drop a folder under `assets/species/<id>/` with the five required mood PNGs
   (64×64).
2. Add the species to `metadata/traits.json`.
3. Add the id to the `SpeciesId` union in `@bagimon/shared`'s `types.ts`.
