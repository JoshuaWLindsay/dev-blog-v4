import { HeroSection } from '@/components/hero-section';
import { BioSection } from '@/components/bio-section';
import MayflyShowcase from '@/components/mayfly-showcase';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      <HeroSection />
      <BioSection />
      <MayflyShowcase />
    </div>
  );
}
