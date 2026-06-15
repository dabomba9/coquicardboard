import { CoquiLoader } from "@/components/mascot/coqui";

export default function WantListLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <CoquiLoader label="Loading your want list" />
      <div className="mb-6 flex flex-wrap gap-2">
        <div className="skeleton h-9 w-48 rounded-full" />
        <div className="skeleton ml-auto h-9 w-40 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[5/7] rounded-md bg-card" />
        ))}
      </div>
    </div>
  );
}
