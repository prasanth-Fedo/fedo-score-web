"use client";

import Card from "@/components/ui/Card";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import Sparkline from "@/components/ui/Sparkline";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";

type ConfidenceLevel = "good" | "fair" | "warning";

interface VitalCardProps {
  label: string;
  value: number;
  unit: string;
  icon: Parameters<typeof Icon>[0]["type"];
  status?: ConfidenceLevel;
  statusLabel?: string;
  decimals?: number;
  sparklineData?: number[];
  delay?: number; // animation delay index
  sub?: string;
  large?: boolean;
}

const borderColors: Record<ConfidenceLevel, string> = {
  good: "border-l-health-good",
  fair: "border-l-health-fair",
  warning: "border-l-health-warning",
};

export default function VitalCard({
  label,
  value,
  unit,
  icon,
  status = "good",
  statusLabel,
  decimals = 0,
  sparklineData,
  delay = 0,
  sub,
  large = false,
}: VitalCardProps) {
  return (
    <Card
      variant="elevated"
      className={`p-4 border-l-4 ${borderColors[status]} opacity-0 animate-fade-up ${
        large ? "col-span-1" : ""
      }`}
      style={{ animationDelay: `${delay * 100}ms`, animationFillMode: "forwards" } as any}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon type={icon} size={18} className="text-cream-400" />
          <span className="text-cream-500 text-xs font-medium">{label}</span>
        </div>
        {statusLabel && (
          <Badge status={status}>{statusLabel}</Badge>
        )}
      </div>

      <div className="flex items-baseline gap-1">
        <AnimatedNumber
          value={value}
          decimals={decimals}
          duration={1200}
          className="font-display text-2xl font-bold text-cream-800"
        />
        <span className="text-cream-400 text-sm">{unit}</span>
      </div>

      {sub && (
        <p className="text-cream-400 text-xs mt-1">{sub}</p>
      )}

      {sparklineData && sparklineData.length > 5 && (
        <div className="mt-2">
          <Sparkline
            data={sparklineData}
            width={140}
            height={28}
            color={
              status === "good"
                ? "#22C55E"
                : status === "fair"
                  ? "#F59E0B"
                  : "#EF4444"
            }
            fillColor={
              status === "good"
                ? "rgba(34,197,94,0.1)"
                : status === "fair"
                  ? "rgba(245,158,11,0.1)"
                  : "rgba(239,68,68,0.1)"
            }
          />
        </div>
      )}
    </Card>
  );
}
