export default function CardLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="skeleton h-3 w-24 rounded" />
      <div className="mt-4 grid gap-8 sm:grid-cols-[280px_1fr]">
        {/* image */}
        <div className="skeleton aspect-[5/7] w-full rounded-md bg-card" />
        {/* identity + actions */}
        <div className="space-y-4">
          <div className="skeleton h-5 w-24 rounded-full" />
          <div className="skeleton h-7 w-3/4 rounded" />
          <div className="flex gap-3">
            <div className="skeleton h-10 w-32 rounded-full" />
            <div className="skeleton h-10 w-28 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="skeleton h-2.5 w-16 rounded" />
                <div className="skeleton h-4 w-24 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* market value panel */}
      <div className="mt-8 rounded-2xl border border-border/50 p-5">
        <div className="skeleton h-3 w-28 rounded" />
        <div className="skeleton mt-3 h-9 w-40 rounded" />
        <div className="skeleton mt-4 h-40 w-full rounded-lg" />
      </div>
    </div>
  );
}
