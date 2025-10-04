import MayflyShowcase from '@/components/mayfly-showcase'

export default function ProjectsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Projects</h1>
      <div className="space-y-12">
        <MayflyShowcase />
        {/* Add more project showcases here */}
      </div>
    </div>
  )
}
