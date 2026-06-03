"use client";

import { useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { formatUsd } from "@/lib/utils";
import type { PriceSeries } from "@/lib/queries";

function fmtMonth(d: string) {
  const [y, m] = d.split("-");
  return `${["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m]} '${y.slice(2)}`;
}

export function PriceChart({ series }: { series: PriceSeries[] }) {
  const [active, setActive] = useState(series[0]?.grade_key ?? "raw");
  if (series.length === 0) return null;
  const cur = series.find((s) => s.grade_key === active) ?? series[0];
  const data = cur.points.map((p) => ({ date: fmtMonth(p.date), value: p.value / 100 }));
  const latest = cur.points[cur.points.length - 1];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {series.map((s) => (
          <button
            key={s.grade_key}
            onClick={() => setActive(s.grade_key)}
            className={`rounded-full px-2.5 py-0.5 text-xs ring-1 transition-colors ${
              s.grade_key === active
                ? "bg-amber-500/15 text-amber-300 ring-amber-500/40"
                : "text-muted ring-border hover:text-foreground"
            }`}
          >
            {s.grade_key}
          </button>
        ))}
        {latest && (
          <span className="ml-auto text-sm">
            <span className="font-semibold">{formatUsd(latest.value)}</span>
            <span className="ml-2 text-xs text-muted">estimated · as of {fmtMonth(latest.date)}</span>
          </span>
        )}
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--chart-axis)" }} minTickGap={28} />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--chart-axis)" }} width={64}
              tickFormatter={(v) => formatUsd(v * 100)}
            />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "var(--foreground)" }}
              formatter={(v) => [formatUsd(Number(v) * 100), cur.grade_key]}
            />
            <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
