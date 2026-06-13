import { CoquiLoader } from "@/components/mascot/coqui";

export default function CollectionLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <CoquiLoader label="Loading your collection" />
      <div className="mt-6 grid gap-4 lg:grid-cols-[auto_1fr]">
        <div className="skeleton rounded-xl h-36 w-72 bg-card" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton rounded-xl h-24 bg-card" />)}
        </div>
      </div>
      <div className="skeleton rounded-xl mt-4 h-56 bg-card" />
    </div>
  );
}
