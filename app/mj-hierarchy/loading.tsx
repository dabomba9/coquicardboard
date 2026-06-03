export default function HierarchyLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="skeleton h-7 w-48 rounded-md" />
      <div className="skeleton mt-2 h-4 w-72 rounded-md" />
      <div className="mt-6 flex gap-2">
        <div className="skeleton h-9 w-64 rounded-md" />
        <div className="skeleton h-9 w-32 rounded-md" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[5/7] rounded-lg" />
        ))}
      </div>
    </div>
  );
}
