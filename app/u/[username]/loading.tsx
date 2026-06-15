export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* profile header */}
      <div className="flex items-center gap-4">
        <div className="skeleton h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <div className="skeleton h-6 w-40 rounded" />
          <div className="skeleton h-3 w-56 rounded" />
        </div>
      </div>
      {/* card grid */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[5/7] rounded-md bg-card" />
        ))}
      </div>
    </div>
  );
}
