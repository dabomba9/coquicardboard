export default function CollectionLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="skeleton h-7 w-44 rounded-md" />
      <div className="mt-6 grid gap-4 lg:grid-cols-[auto_1fr]">
        <div className="skeleton h-36 w-72 rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
      <div className="skeleton mt-4 h-56 rounded-xl" />
    </div>
  );
}
