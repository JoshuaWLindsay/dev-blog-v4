import { HeroSection } from '@/components/hero-section'
import { BioSection } from '@/components/bio-section'
import MayflyShowcase from '@/components/mayfly-showcase'

export default function Home() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-4">
      <HeroSection />
      <BioSection />
      <MayflyShowcase />
    </div>
  )
}
