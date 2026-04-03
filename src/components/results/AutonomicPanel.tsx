"use client";

import Card from "@/components/ui/Card";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import ProgressRing from "@/components/ui/ProgressRing";
import type { AutonomicResult } from "@/lib/types";

interface AutonomicPanelProps {
  data: AutonomicResult;
}

export default function AutonomicPanel({ data }: AutonomicPanelProps) {
  const balance = data.sympathetic / (data.sympathetic + data.parasympathetic + 0.001);

  return (
    <Card
      variant="elevated"
      className="p-5 animate-fade-up anim-delay-700"
      style={{ animationFillMode: "forwards" } as any}
    >
      <h3 className="font-display font-semibold text-cream-800 text-sm mb-4">
        Autonomic Nervous System
      </h3>

      {/* Balance bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] text-cream-400 mb-1">
          <span>Parasympathetic (Rest)</span>
          <span>Sympathetic (Stress)</span>
        </div>
        <div className="h-3 bg-cream-100 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-sky-300 rounded-l-full transition-all duration-1000"
            style={{ width: `${(1 - balance) * 100}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-warm-300 to-warm-400 rounded-r-full transition-all duration-1000"
            style={{ width: `${balance * 100}%` }}
          />
        </div>
      </div>

      {/* Primary metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-2 bg-cream-50 rounded-xl">
          <span className="text-cream-400 text-[10px]">Vagal Tone</span>
          <AnimatedNumber value={data.vagal_tone} className="block font-display font-bold text-lg text-cream-800" />
        </div>
        <div className="text-center p-2 bg-cream-50 rounded-xl">
          <span className="text-cream-400 text-[10px]">Cardiac Load</span>
          <AnimatedNumber value={data.cardiac_load} className="block font-display font-bold text-lg text-cream-800" />
        </div>
      </div>

      {/* Composite scores */}
      <div className="flex justify-around">
        <div className="flex flex-col items-center">
          <ProgressRing
            value={100 - data.anxiety}
            max={100}
            size={56}
            color={data.anxiety < 40 ? "#22C55E" : data.anxiety < 65 ? "#F59E0B" : "#EF4444"}
            label="Calm"
            animated
          />
          <span className="text-[10px] text-cream-400 mt-1">Anxiety: {Math.round(data.anxiety)}</span>
        </div>
        <div className="flex flex-col items-center">
          <ProgressRing
            value={data.sleep_quality}
            max={100}
            size={56}
            color={data.sleep_quality > 70 ? "#22C55E" : data.sleep_quality > 40 ? "#F59E0B" : "#EF4444"}
            label="Sleep"
            animated
          />
          <span className="text-[10px] text-cream-400 mt-1">Quality: {Math.round(data.sleep_quality)}</span>
        </div>
        <div className="flex flex-col items-center">
          <ProgressRing
            value={data.recovery}
            max={100}
            size={56}
            color={data.recovery > 60 ? "#22C55E" : data.recovery > 30 ? "#F59E0B" : "#EF4444"}
            label="Recov"
            animated
          />
          <span className="text-[10px] text-cream-400 mt-1">Recovery: {Math.round(data.recovery)}</span>
        </div>
      </div>
    </Card>
  );
}
