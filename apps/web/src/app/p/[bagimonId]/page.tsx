import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchBagimonForPetdex } from '../../../lib/fetch-bagimon';
import { Hero } from '../../../components/petdex/Hero';
import { LiveStats } from '../../../components/petdex/LiveStats';
import { MoodHistory } from '../../../components/petdex/MoodHistory';
import { RecentInteractions } from '../../../components/petdex/RecentInteractions';
import { CoinFooter } from '../../../components/petdex/CoinFooter';
import { PoweredBy } from '../../../components/petdex/PoweredBy';
import styles from './page.module.css';

interface PageProps {
  params: { bagimonId: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await fetchBagimonForPetdex(params.bagimonId);
  if (!data) {
    return { title: 'Bagimon — not found' };
  }
  const { bagimon } = data;
  const symbol = bagimon.coinSymbol ? `$${bagimon.coinSymbol}` : 'Bagimon';
  const title = `${symbol} — Bagimon Petdex`;
  const description = `A ${bagimon.speciesDisplayName} spirit, currently ${bagimon.currentMood.toUpperCase()}. ${bagimon.speciesLore}`;
  const base = process.env.NEXT_PUBLIC_PETDEX_BASE_URL ?? '';
  const url = base ? `${base}/p/${bagimon.id}` : undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      ...(url ? { url } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function PetdexPage({ params }: PageProps) {
  const data = await fetchBagimonForPetdex(params.bagimonId);
  if (!data) notFound();

  const { bagimon, moodHistory, interactions } = data;
  const imageSrc = `/api/bagimon/${bagimon.id}/image`;

  return (
    <div className={styles.shell} data-mood={bagimon.currentMood}>
      <main className="page">
        <Hero bagimon={bagimon} imageSrc={imageSrc} />
        <LiveStats bagimon={bagimon} />
        <MoodHistory segments={moodHistory} bornAt={bagimon.bornAt} />
        <RecentInteractions interactions={interactions} coinSymbol={bagimon.coinSymbol} />
        <CoinFooter bagimon={bagimon} />
        <PoweredBy />
      </main>
    </div>
  );
}
