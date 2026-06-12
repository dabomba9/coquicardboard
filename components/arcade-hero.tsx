import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/primitives";

// "Legends of the Game" arcade hero — the user's pixel-art scene as the centerpiece,
// framed like a cabinet screen. The global CRT overlay adds scanlines on top.
export function ArcadeHero() {
  return (
    <section
      className="relative overflow-hidden border-b-2 border-border pb-14 pt-28 sm:pt-32"
      style={{ background: "#140f33" }}
    >
      <div className="mx-auto max-w-6xl px-4">
        {/* Cabinet bezel */}
        <div className="pixel-box overflow-hidden bg-[#0a0818] p-1.5 shadow-[0_18px_60px_-20px_rgba(0,0,0,0.6)]">
          <Image
            src="/hero-legends.jpg"
            alt="Legends of the Game — pixel-art sports legends in a stadium"
            width={1376}
            height={768}
            priority
            unoptimized
            className="pixelated block h-auto w-full"
          />
        </div>

        <div className="mt-8 text-center">
          <p className="mx-auto max-w-xl text-sm text-[#cdd2f0]">
            Track the legends, card by card — grade, value, and share the definitive Michael Jordan hierarchy,
            with more on the way.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/mj-hierarchy"><Button className="h-12 px-6 text-base">▶ Explore the MJ Hierarchy</Button></Link>
            <Link href="/guides"><Button variant="secondary" className="h-12 px-6 text-base">Read the guides</Button></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
