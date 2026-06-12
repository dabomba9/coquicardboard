import { CoquiLoader } from "@/components/mascot/coqui";

export default function HierarchyLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <CoquiLoader label="Loading the collection" />
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[5/7] pixel-box bg-card" />
        ))}
      </div>
    </div>
  );
}
