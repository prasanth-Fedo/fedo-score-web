"use client";

interface ProgressBarProps {
  value: number; // 0-1
  className?: string;
  color?: string; // from/to gradient classes
  height?: string;
}

export default function ProgressBar({
  value,
  className = "",
  color = "from-warm-400 to-warm-500",
  height = "h-2",
}: ProgressBarProps) {
  const pct = Math.min(Math.max(value, 0), 1) * 100;

  return (
    <div className={`w-full bg-cream-100 rounded-full overflow-hidden ${height} ${className}`}>
      <div
        className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500 ease-out`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
