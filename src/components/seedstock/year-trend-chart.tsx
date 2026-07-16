"use client";

interface YearTrendChartProps {
  title: string;
  subtitle?: string;
  points: { year: number; value: number }[];
  valueSuffix?: string;
  maxValue?: number;
}

export function YearTrendChart({
  title,
  subtitle,
  points,
  valueSuffix = "",
  maxValue,
}: YearTrendChartProps) {
  if (points.length < 2) return null;

  const sorted = [...points].sort((a, b) => a.year - b.year);
  const peak = maxValue ?? Math.max(...sorted.map((p) => p.value), 1);

  return (
    <div className="rounded-xl border border-border-neutral bg-surface-white p-4">
      <div className="mb-4">
        <h3 className="font-semibold text-navy">{title}</h3>
        {subtitle ? <p className="text-xs text-text-secondary">{subtitle}</p> : null}
      </div>
      <div className="flex items-end gap-2 sm:gap-3" style={{ minHeight: 120 }}>
        {sorted.map((p) => {
          const height = Math.max(8, Math.round((p.value / peak) * 100));
          const prev = sorted.find((x) => x.year === p.year - 1);
          const delta = prev ? p.value - prev.value : null;
          return (
            <div key={p.year} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs font-medium text-navy">
                {p.value}
                {valueSuffix}
              </span>
              <div
                className="w-full max-w-[48px] rounded-t-md bg-navy transition-all"
                style={{ height: `${height}px` }}
                title={`${p.year}: ${p.value}${valueSuffix}`}
              />
              <span className="text-xs text-text-secondary">{p.year}</span>
              {delta != null ? (
                <span
                  className={`text-[10px] ${delta >= 0 ? "text-brown" : "text-status-critical"}`}
                >
                  {delta >= 0 ? "+" : ""}
                  {Math.round(delta * 10) / 10}
                  {valueSuffix}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
