import { Hero } from '../components/homepage/Hero';
import { LiveBagimons } from '../components/homepage/LiveBagimons';
import { HowItWorks } from '../components/homepage/HowItWorks';
import { MoodLifecycle } from '../components/homepage/MoodLifecycle';
import { WhyBagimon } from '../components/homepage/WhyBagimon';
import { GetStarted } from '../components/homepage/GetStarted';
import { Footer } from '../components/homepage/Footer';
import { fetchLiveBagimonsForHomepage, type HomepageBagimon } from '../lib/fetch-homepage';

export const revalidate = 300;

export default async function HomePage() {
  let liveBagimons: HomepageBagimon[] = [];
  try {
    liveBagimons = await fetchLiveBagimonsForHomepage(4);
  } catch (err) {
    console.error('homepage live bagimons fetch failed', err);
  }

  return (
    <main className="page" data-mood="happy">
      <Hero />
      <LiveBagimons bagimons={liveBagimons} />
      <HowItWorks />
      <MoodLifecycle />
      <WhyBagimon />
      <GetStarted />
      <Footer />
    </main>
  );
}
