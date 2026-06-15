"use client";

import { useEffect, useState } from "react";

const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Puerto_Rico",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

// Live San Juan local time. Renders a stable placeholder until mounted so the
// server/client markup matches (no hydration warning), then ticks every second.
export function PrClock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="tabular-nums" aria-label="Current time in San Juan, Puerto Rico">
      San Juan — {time ?? "‑‑:‑‑:‑‑"}
    </span>
  );
}
