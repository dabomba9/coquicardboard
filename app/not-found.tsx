import Link from "next/link";
import { Coqui } from "@/components/mascot/coqui";
import { Button } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-24 text-center">
      <Coqui pose="faint" size={96} bob={false} aria-label="Coqui has fainted" />
      <h1 className="font-display text-2xl uppercase tracking-tight text-accent">Game Over</h1>
      <p className="text-sm text-muted">
        This page is in another castle. The card or route you were looking for doesn&apos;t exist.
      </p>
      <Link href="/"><Button>▶ Return to town</Button></Link>
    </div>
  );
}
