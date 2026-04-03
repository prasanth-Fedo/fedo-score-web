"use client";

import AnimatedNumber from "@/components/ui/AnimatedNumber";
import type { DomainScores as DomainScoresType } from "@/lib/types";

interface DomainScoresProps {
  domains: DomainScoresType;
}

const DOMAIN_CONFIG: { key: keyof DomainScoresType; label: string; max: number; color: string }[] = [
  { key: "cardiovascular", label: "Cardio", max: 250, color: "bg-red-100 text-red-600" },
  { key: "metabolic", label: "Metabolic", max: 200, color: "bg-amber-100 text-amber-600" },
  { key: "respiratory", label: "Respiratory", max: 100, color: "bg-sky-100 text-sky-600" },
  { key: "organ_health", label: "Organ", max: 150, color: "bg-green-100 text-green-600" },
  { key: "lifestyle_recovery", label: "Lifestyle", max: 150, color: "bg-purple-100 text-purple-600" },
  { key: "resilience_aging", label: "Resilience", max: 150, color: "bg-warm-100 text-warm-600" },
];

export default function DomainScores({ domains }: DomainScoresProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 animate-fade-up anim-delay-200" style={{ animationFillMode: "forwards" } as any}>
      {DOMAIN_CONFIG.map((d) => (
        <div
          key={d.key}
          className={`flex-shrink-0 px-3 py-2 rounded-xl ${d.color} flex flex-col items-center min-w-[80px]`}
        >
          <span className="text-[10px] font-medium opacity-80">{d.label}</span>
          <AnimatedNumber
            value={domains[d.key]}
            className="font-display text-lg font-bold"
          />
          <span className="text-[9px] opacity-60">/{d.max}</span>
        </div>
      ))}
    </div>
  );
}
