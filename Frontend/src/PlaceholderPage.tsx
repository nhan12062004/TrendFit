export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-text-primary mb-4">{title}</h2>
        <p className="text-text-secondary">This page is under construction.</p>
      </div>
    </div>
  );
}
