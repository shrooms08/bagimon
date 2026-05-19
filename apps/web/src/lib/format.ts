export function formatUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (abs >= 1) return `$${value.toFixed(2)}`;
  // Sub-dollar — keep up to 5 sig figs.
  return `$${value.toPrecision(3)}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function relativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return 'just now';
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const d = Math.floor(hr / 24);
  return `${d} d ago`;
}

export function shortMint(mint: string): string {
  if (mint.length <= 14) return mint;
  return `${mint.slice(0, 5)}…${mint.slice(-10)}`;
}

export function dayCount(from: Date, to: Date = new Date()): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
}

// Build the public Petdex number from a bagimon UUID. Deterministic, 4 digits.
export function petdexNumber(bagimonId: string): string {
  const hex = bagimonId.replace(/-/g, '').slice(0, 4);
  const n = parseInt(hex, 16);
  const slot = Number.isFinite(n) ? n % 9999 : 0;
  return `№ ${String(slot).padStart(4, '0')}`;
}

export function bornAtLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
