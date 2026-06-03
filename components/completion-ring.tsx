// SVG circular progress ring. Pure presentational (server-renderable).
export function CompletionRing({
  owned,
  total,
  size = 120,
}: {
  owned: number;
  total: number;
  size?: number;
}) {
  const pct = total ? owned / total : 0;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold leading-none">{Math.round(pct * 100)}%</div>
        <div className="mt-1 text-[11px] text-muted">{owned}/{total}</div>
      </div>
    </div>
  );
}
