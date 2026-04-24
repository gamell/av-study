"use client";

import { cn } from "@/lib/utils";

interface Segment {
  value: number;
  className: string;
  label: string;
}

interface StackedProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  segments: Segment[];
  max: number;
}

export function StackedProgress({
  segments,
  max,
  className,
  ...props
}: StackedProgressProps) {
  const safeMax = Math.max(max, 1);

  return (
    <div
      role="progressbar"
      className={cn(
        "relative h-3 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      {...props}
    >
      <div className="flex h-full">
        {segments.map((seg) => {
          const pct = Math.min(100, Math.max(0, (seg.value / safeMax) * 100));
          if (pct === 0) return null;
          return (
            <div
              key={seg.label}
              className={cn("h-full transition-all duration-500", seg.className)}
              style={{ width: `${pct}%` }}
              title={`${seg.label}: ${seg.value}`}
            />
          );
        })}
      </div>
    </div>
  );
}
