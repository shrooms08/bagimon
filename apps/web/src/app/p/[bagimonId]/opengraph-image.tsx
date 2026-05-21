import { ImageResponse } from 'next/og';
import { fetchBagimonForPetdex } from '../../../lib/fetch-bagimon';
import { renderBagimonPng } from '../../../lib/bagimon-art';

export const runtime = 'nodejs';
export const alt = 'Bagimon Petdex';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const MOOD_BG: Record<string, { bg: string; ink: string; accent: string; soft: string }> = {
  happy: { bg: '#f7ecd2', ink: '#2c2418', accent: '#e87a5e', soft: '#5b4a30' },
  thriving: { bg: '#fff3c8', ink: '#2a2310', accent: '#e9a92a', soft: '#6a531a' },
  hungry: { bg: '#e8d9b6', ink: '#2f200f', accent: '#c0673a', soft: '#6a4f2a' },
  sick: { bg: '#d8d4dc', ink: '#2b1f2e', accent: '#8a5c84', soft: '#564860' },
  dying: { bg: '#cfcabe', ink: '#3a352c', accent: '#9a8a70', soft: '#6c655a' },
  memorial: { bg: '#c5c2bb', ink: '#2f2c26', accent: '#7a766d', soft: '#5e5a52' },
};

export default async function Image({ params }: { params: { bagimonId: string } }) {
  const data = await fetchBagimonForPetdex(params.bagimonId);
  const isDead = data ? !data.bagimon.isAlive : false;
  const paletteKey = isDead ? 'memorial' : (data?.bagimon.currentMood ?? 'happy');
  const palette = MOOD_BG[paletteKey] ?? MOOD_BG.happy!;
  const renderMood = isDead ? 'dying' : (data?.bagimon.currentMood ?? 'happy');
  const sprite = data
    ? await renderBagimonPng(data.bagimon.coinMint, renderMood, 480)
    : null;
  const spriteDataUrl = sprite ? `data:image/png;base64,${sprite.toString('base64')}` : null;

  const symbol = data?.bagimon.coinSymbol ? `$${data.bagimon.coinSymbol}` : 'BAGIMON';
  const titleText = isDead ? `💀 In memoriam: ${symbol}` : symbol;
  const speciesLine = !data
    ? 'NOT FOUND'
    : isDead
      ? `LIVED ${data.bagimon.lifespanDays} DAY${data.bagimon.lifespanDays === 1 ? '' : 'S'}`
      : `${data.bagimon.speciesDisplayName.toUpperCase()} · ${data.bagimon.currentMood.toUpperCase()}`;
  const feesLine =
    data && data.bagimon.lifetimeFeesSol != null
      ? `${data.bagimon.lifetimeFeesSol.toFixed(2)} SOL EARNED`
      : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: palette.bg,
          color: palette.ink,
          padding: 60,
        }}
      >
        <div
          style={{
            width: 480,
            height: 480,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fff7e2',
            border: `8px solid ${palette.ink}`,
          }}
        >
          {spriteDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={spriteDataUrl} width={460} height={460} alt="" />
          ) : null}
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingLeft: 50,
          }}
        >
          <div style={{ fontSize: 36, color: palette.soft, letterSpacing: 2 }}>BAGIMON PETDEX</div>
          <div
            style={{
              fontSize: 120,
              fontWeight: 800,
              color: palette.ink,
              marginTop: 6,
              textShadow: `6px 6px 0 ${palette.accent}`,
              wordBreak: 'break-word',
            }}
          >
            {titleText}
          </div>
          <div style={{ fontSize: 32, color: palette.ink, marginTop: 24, letterSpacing: 1 }}>
            {speciesLine}
          </div>
          {feesLine ? (
            <div style={{ fontSize: 26, color: palette.soft, marginTop: 14, letterSpacing: 1 }}>
              {feesLine}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { ...size },
  );
}
