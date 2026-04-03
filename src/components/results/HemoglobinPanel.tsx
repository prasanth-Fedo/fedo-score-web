"use client";

import Card from "@/components/ui/Card";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import Badge from "@/components/ui/Badge";
import type { HemoglobinResult, SmokerResult } from "@/lib/types";

interface HemoglobinPanelProps {
  hemoglobin: HemoglobinResult;
  smoker: SmokerResult;
}

export default function HemoglobinPanel({ hemoglobin, smoker }: HemoglobinPanelProps) {
  const anemiaStatus =
    hemoglobin.anemia_risk === "low" ? "good" : hemoglobin.anemia_risk === "moderate" ? "fair" : "warning";

  return (
    <div className="grid grid-cols-2 gap-3 animate-fade-up anim-delay-700" style={{ animationFillMode: "forwards" } as any}>
      {/* Hemoglobin */}
      {hemoglobin.gdl > 0 && (
        <Card variant="elevated" className="p-4">
          <span className="text-cream-400 text-xs block mb-1">Hemoglobin</span>
          <div className="flex items-baseline gap-1">
            <AnimatedNumber
              value={hemoglobin.gdl}
              decimals={1}
              className="font-display text-2xl font-bold text-cream-800"
            />
            <span className="text-cream-400 text-sm">g/dL</span>
          </div>
          <Badge status={anemiaStatus} className="mt-2">
            Anemia risk: {hemoglobin.anemia_risk}
          </Badge>
          {hemoglobin.flags.length > 0 && (
            <p className="text-cream-400 text-[10px] mt-1">
              {hemoglobin.flags.join(", ")}
            </p>
          )}
        </Card>
      )}

      {/* Smoker Detection */}
      <Card variant="elevated" className="p-4">
        <span className="text-cream-400 text-xs block mb-1">Smoker Detection</span>
        <p className="font-display font-bold text-lg text-cream-800 capitalize">
          {smoker.prediction}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-1.5 bg-cream-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                smoker.probability < 40
                  ? "bg-health-good"
                  : smoker.probability < 70
                    ? "bg-health-fair"
                    : "bg-health-warning"
              }`}
              style={{ width: `${smoker.probability}%` }}
            />
          </div>
          <span className="text-cream-500 text-xs">{smoker.probability}%</span>
        </div>
      </Card>
    </div>
  );
}
