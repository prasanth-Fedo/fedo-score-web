"use client";

import Card from "@/components/ui/Card";
import ProgressRing from "@/components/ui/ProgressRing";

interface WellnessBannerProps {
  stressIndex: number; // 0-100
  stressLevel: string;
  recoveryScore: number; // 0-100
}

function stressColor(level: string): string {
  if (level === "low") return "#22C55E";
  if (level === "moderate") return "#F59E0B";
  return "#EF4444";
}

function stressSummary(level: string): string {
  if (level === "low") return "Your stress levels are well-managed. Keep it up!";
  if (level === "moderate") return "Moderate stress detected. Consider relaxation techniques.";
  return "High stress indicators. Prioritize rest and recovery.";
}

export default function WellnessBanner({
  stressIndex,
  stressLevel,
  recoveryScore,
}: WellnessBannerProps) {
  return (
    <Card
      variant="elevated"
      className="p-5 flex items-center gap-5 animate-fade-up anim-delay-600"
      style={{ animationFillMode: "forwards" } as any}
    >
      <ProgressRing
        value={100 - stressIndex}
        max={100}
        size={72}
        color={stressColor(stressLevel)}
        label="Wellness"
        animated
      />
      <div className="flex-1">
        <p className="font-display font-semibold text-cream-800 text-sm mb-1">
          Stress: <span className="capitalize">{stressLevel}</span>
        </p>
        <p className="text-cream-500 text-xs leading-relaxed">
          {stressSummary(stressLevel)}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-cream-400 text-[10px]">Recovery</span>
          <div className="flex-1 h-1.5 bg-cream-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-sky-500 rounded-full transition-all duration-1000"
              style={{ width: `${recoveryScore}%` }}
            />
          </div>
          <span className="text-cream-500 text-[10px] font-medium">{recoveryScore}%</span>
        </div>
      </div>
    </Card>
  );
}
