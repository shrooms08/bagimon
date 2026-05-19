import type { Metadata } from 'next';
import { Press_Start_2P, Nunito } from 'next/font/google';
import { PaperNoise } from '../components/ui/PaperNoise';
import '../styles/globals.css';

const pressStart = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-press-start',
});

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  display: 'swap',
  variable: '--font-nunito',
});

export const metadata: Metadata = {
  title: 'Bagimon — Petdex',
  description: 'A digital spirit for every coin on Bags.fm.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pressStart.variable} ${nunito.variable}`}>
      <body>
        <PaperNoise />
        {children}
      </body>
    </html>
  );
}
