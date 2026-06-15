import { CoquiLoader } from "@/components/mascot/coqui";

export default function AnalyticsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <CoquiLoader label="Crunching the numbers" />
      {/* stat panels */}
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/50 p-4">
            <div className="skeleton h-2.5 w-20 rounded" />
            <div className="skeleton mt-2 h-7 w-28 rounded" />
            <div className="skeleton mt-2 h-2.5 w-24 rounded" />
          </div>
        ))}
      </div>
      {/* chart */}
      <div className="mt-4 rounded-2xl border border-border/50 p-4">
        <div className="skeleton h-3 w-40 rounded" />
        <div className="skeleton mt-3 h-56 w-full rounded-lg" />
      </div>
      {/* two list panels */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, p) => (
          <div key={p} className="rounded-2xl border border-border/50 p-5">
            <div className="skeleton h-3 w-32 rounded" />
            <div className="mt-3 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-4 w-full rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
