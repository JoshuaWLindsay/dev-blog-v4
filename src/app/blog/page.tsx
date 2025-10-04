import { BioSection } from '@/components/bio-section'

export default function BlogPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Blog</h1>
      <div className="space-y-12">
        <BioSection />
        {/* Add more project showcases here */}
      </div>
    </div>
  )
}
