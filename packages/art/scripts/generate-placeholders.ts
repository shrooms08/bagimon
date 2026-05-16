#!/usr/bin/env tsx
/**
 * Generates throwaway 256x256 placeholder PNGs for every asset listed in
 * packages/art/metadata/traits.json. Real Pixelorama art replaces these later.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SIZE = 256;
const here = dirname(fileURLToPath(import.meta.url));
const artRoot = resolve(here, '..');
const assetsDir = resolve(artRoot, 'assets');

function transparentBase(): sharp.Sharp {
  return sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });
}

function svgBuffer(svg: string): Buffer {
  return Buffer.from(svg);
}

async function writePng(relPath: string, sharpPipeline: sharp.Sharp): Promise<void> {
  const out = resolve(assetsDir, relPath);
  await mkdir(dirname(out), { recursive: true });
  await sharpPipeline.png().toFile(out);
  console.info(`wrote ${relPath}`);
}

const BODY_COLORS = [
  '#f87171',
  '#fb923c',
  '#facc15',
  '#4ade80',
  '#22d3ee',
  '#60a5fa',
  '#a78bfa',
  '#f472b6',
];

async function generateBodies(): Promise<void> {
  for (let i = 0; i < BODY_COLORS.length; i++) {
    const color = BODY_COLORS[i];
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
        <rect x="40" y="56" width="176" height="176" rx="40" ry="40" fill="${color}" />
      </svg>`;
    const layer = await sharp(svgBuffer(svg)).png().toBuffer();
    await writePng(
      `bodies/body_${String(i + 1).padStart(2, '0')}.png`,
      transparentBase().composite([{ input: layer }]),
    );
  }
}

const EYE_POSITIONS: ReadonlyArray<readonly [number, number, number]> = [
  [88, 120, 14],
  [92, 124, 12],
  [84, 116, 16],
  [96, 128, 10],
  [80, 112, 18],
  [100, 130, 8],
];

async function generateEyes(): Promise<void> {
  for (let i = 0; i < EYE_POSITIONS.length; i++) {
    const pos = EYE_POSITIONS[i];
    if (!pos) continue;
    const [lx, y, r] = pos;
    const rx = SIZE - lx;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
        <circle cx="${lx}" cy="${y}" r="${r}" fill="#111" />
        <circle cx="${rx}" cy="${y}" r="${r}" fill="#111" />
      </svg>`;
    const layer = await sharp(svgBuffer(svg)).png().toBuffer();
    await writePng(
      `eyes/eyes_${String(i + 1).padStart(2, '0')}.png`,
      transparentBase().composite([{ input: layer }]),
    );
  }
}

async function generateMouths(): Promise<void> {
  const shapes = [
    '<line x1="108" y1="172" x2="148" y2="172" stroke="#111" stroke-width="4" stroke-linecap="round" />',
    '<path d="M 108 168 Q 128 188 148 168" fill="none" stroke="#111" stroke-width="4" stroke-linecap="round" />',
    '<ellipse cx="128" cy="174" rx="10" ry="6" fill="#111" />',
    '<path d="M 108 174 Q 128 162 148 174" fill="none" stroke="#111" stroke-width="4" stroke-linecap="round" />',
    '<rect x="116" y="170" width="24" height="6" rx="2" fill="#111" />',
    '<path d="M 108 170 Q 118 184 128 170 Q 138 184 148 170" fill="none" stroke="#111" stroke-width="4" stroke-linecap="round" />',
  ];
  for (let i = 0; i < shapes.length; i++) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">${shapes[i]}</svg>`;
    const layer = await sharp(svgBuffer(svg)).png().toBuffer();
    await writePng(
      `mouths/mouth_${String(i + 1).padStart(2, '0')}.png`,
      transparentBase().composite([{ input: layer }]),
    );
  }
}

const ACCESSORY_SHAPES: readonly string[] = [
  // hats
  '<rect x="80" y="32" width="96" height="20" fill="#1f2937" /><rect x="96" y="12" width="64" height="24" fill="#1f2937" />',
  '<path d="M 88 48 L 168 48 L 128 8 Z" fill="#dc2626" />',
  '<rect x="84" y="40" width="88" height="14" fill="#0ea5e9" /><rect x="100" y="20" width="56" height="24" rx="4" fill="#0ea5e9" />',
  '<path d="M 96 48 Q 128 0 160 48 Z" fill="#16a34a" />',
  // scarves / collars
  '<rect x="64" y="200" width="128" height="16" fill="#a855f7" />',
  '<rect x="56" y="208" width="144" height="12" fill="#f97316" /><rect x="120" y="216" width="16" height="24" fill="#f97316" />',
  // crowns / bows
  '<path d="M 88 36 L 100 16 L 128 36 L 156 16 L 168 36 Z" fill="#fbbf24" stroke="#92400e" stroke-width="2" />',
  '<circle cx="100" cy="44" r="12" fill="#ec4899" /><circle cx="156" cy="44" r="12" fill="#ec4899" /><rect x="120" y="40" width="16" height="10" fill="#ec4899" />',
  // antenna / horn
  '<line x1="128" y1="56" x2="128" y2="16" stroke="#111" stroke-width="3" /><circle cx="128" cy="14" r="6" fill="#ef4444" />',
  '<path d="M 116 56 L 128 8 L 140 56 Z" fill="#6366f1" />',
  // rare
  '<path d="M 80 56 L 96 16 L 112 56 L 128 8 L 144 56 L 160 16 L 176 56 Z" fill="#06b6d4" stroke="#0e7490" stroke-width="2" />',
  // legendary halo
  '<ellipse cx="128" cy="24" rx="56" ry="10" fill="none" stroke="#facc15" stroke-width="4" /><ellipse cx="128" cy="24" rx="40" ry="6" fill="none" stroke="#fde047" stroke-width="2" />',
];

async function generateAccessories(): Promise<void> {
  for (let i = 0; i < ACCESSORY_SHAPES.length; i++) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">${ACCESSORY_SHAPES[i]}</svg>`;
    const layer = await sharp(svgBuffer(svg)).png().toBuffer();
    await writePng(
      `accessories/accessory_${String(i + 1).padStart(2, '0')}.png`,
      transparentBase().composite([{ input: layer }]),
    );
  }
}

interface MoodSpec {
  id: string;
  tint: { r: number; g: number; b: number };
  alpha: number;
  marker: string;
}

const MOOD_SPECS: readonly MoodSpec[] = [
  { id: 'mood_happy', tint: { r: 255, g: 244, b: 158 }, alpha: 0.18, marker: '<circle cx="40" cy="40" r="10" fill="#fde047" opacity="0.8" />' },
  { id: 'mood_hungry', tint: { r: 255, g: 200, b: 120 }, alpha: 0.22, marker: '<text x="32" y="48" font-size="28" fill="#9a3412">!</text>' },
  { id: 'mood_sick', tint: { r: 170, g: 220, b: 140 }, alpha: 0.28, marker: '<circle cx="40" cy="40" r="10" fill="#16a34a" opacity="0.6" /><circle cx="60" cy="50" r="6" fill="#16a34a" opacity="0.6" />' },
  { id: 'mood_thriving', tint: { r: 255, g: 180, b: 220 }, alpha: 0.18, marker: '<path d="M 32 48 L 40 32 L 48 48 L 56 32 L 64 48" stroke="#db2777" stroke-width="3" fill="none" />' },
  { id: 'mood_dying', tint: { r: 80, g: 80, b: 90 }, alpha: 0.45, marker: '<line x1="28" y1="28" x2="52" y2="52" stroke="#111" stroke-width="3" /><line x1="52" y1="28" x2="28" y2="52" stroke="#111" stroke-width="3" />' },
];

async function generateMoods(): Promise<void> {
  for (const spec of MOOD_SPECS) {
    const { r, g, b } = spec.tint;
    const tintLayer = await sharp({
      create: {
        width: SIZE,
        height: SIZE,
        channels: 4,
        background: { r, g, b, alpha: spec.alpha },
      },
    })
      .png()
      .toBuffer();
    const markerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">${spec.marker}</svg>`;
    const markerLayer = await sharp(svgBuffer(markerSvg)).png().toBuffer();
    await writePng(
      `moods/${spec.id}.png`,
      transparentBase().composite([{ input: tintLayer }, { input: markerLayer }]),
    );
  }
}

async function main(): Promise<void> {
  await generateBodies();
  await generateEyes();
  await generateMouths();
  await generateAccessories();
  await generateMoods();
  console.info('placeholder generation complete.');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
