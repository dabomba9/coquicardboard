import { CoquiLoader } from "@/components/mascot/coqui";

export default function VaultLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <CoquiLoader label="Opening the vault" />
      {/* faux filter bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        <div className="skeleton h-9 w-48 rounded-full" />
        <div className="skeleton h-9 w-28 rounded-full" />
        <div className="skeleton h-9 w-28 rounded-full" />
        <div className="skeleton ml-auto h-9 w-24 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[5/7] rounded-md bg-card" />
        ))}
      </div>
    </div>
  );
}
