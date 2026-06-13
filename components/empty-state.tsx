import Link from "next/link";
import { Coqui } from "@/components/mascot/coqui";
import { Button } from "@/components/ui/primitives";

/** Friendly, teaching empty state with the Coquí mascot + dual catalog CTAs. */
export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-border/50 bg-card px-6 py-12 text-center">
      <Coqui pose="idle" size={72} aria-label="" />
      <div>
        <h2 className="font-display text-lg uppercase tracking-tight">{title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{body}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/mj-hierarchy"><Button>Browse the MJ Hierarchy</Button></Link>
        <Link href="/vault"><Button variant="secondary">Browse the Jordan Vault</Button></Link>
      </div>
    </div>
  );
}
