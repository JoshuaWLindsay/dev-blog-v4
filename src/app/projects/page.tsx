import MayflyShowcase from '@/components/mayfly-showcase';

export default function ProjectsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Projects</h1>
      <div className="space-y-12">
        <MayflyShowcase />
        {/* Add more project showcases here */}
      </div>
    </div>
  );
}
