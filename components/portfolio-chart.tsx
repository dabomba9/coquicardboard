"use client";

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { formatUsd } from "@/lib/utils";

function fmtMonth(d: string) {
  const [y, m] = d.split("-");
  return `${["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m]} '${y.slice(2)}`;
}

export function PortfolioChart({ points }: { points: { date: string; value: number }[] }) {
  if (points.length === 0) return null;
  const data = points.map((p) => ({ date: fmtMonth(p.date), value: p.value / 100 }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--chart-axis)" }} minTickGap={28} />
          <YAxis tick={{ fontSize: 11, fill: "var(--chart-axis)" }} width={64} tickFormatter={(v) => formatUsd(v * 100)} />
          <Tooltip
            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "var(--foreground)" }}
            formatter={(v) => [formatUsd(Number(v) * 100), "Est. value"]}
          />
          <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} fill="url(#pv)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
