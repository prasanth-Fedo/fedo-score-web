"use client";

import Card from "@/components/ui/Card";

interface AccuracyTableProps {
  currentDuration: number;
}

const PARAMS = [
  { name: "Heart Rate", d12: "fair", d30: "good", d60: "good", d120: "good" },
  { name: "HRV (RMSSD)", d12: "poor", d30: "fair", d60: "good", d120: "good" },
  { name: "SpO2", d12: "poor", d30: "fair", d60: "fair", d120: "good" },
  { name: "Blood Pressure", d12: "poor", d30: "poor", d60: "fair", d120: "fair" },
  { name: "Respiratory Rate", d12: "poor", d30: "fair", d60: "good", d120: "good" },
  { name: "Stress Index", d12: "poor", d30: "fair", d60: "good", d120: "good" },
  { name: "Glucose", d12: "poor", d30: "poor", d60: "poor", d120: "poor" },
  { name: "Hemoglobin", d12: "fair", d30: "fair", d60: "good", d120: "good" },
];

const LEVEL_COLORS: Record<string, string> = {
  good: "text-health-good bg-health-good/10",
  fair: "text-health-fair bg-health-fair/10",
  poor: "text-health-warning bg-health-warning/10",
};

const DURATIONS = [12, 30, 60, 120];

export default function AccuracyTable({ currentDuration }: AccuracyTableProps) {
  function getLevel(param: (typeof PARAMS)[0], dur: number): string {
    if (dur === 12) return param.d12;
    if (dur === 30) return param.d30;
    if (dur === 60) return param.d60;
    return param.d120;
  }

  return (
    <Card
      variant="elevated"
      className="p-4 overflow-x-auto animate-fade-up anim-delay-800"
      style={{ animationFillMode: "forwards" } as any}
    >
      <h3 className="font-display font-semibold text-cream-800 text-sm mb-3">
        Accuracy vs Duration
      </h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-cream-100">
            <th className="text-left py-2 text-cream-400 font-medium">Parameter</th>
            {DURATIONS.map((d) => (
              <th
                key={d}
                className={`text-center py-2 font-medium ${
                  d === currentDuration
                    ? "text-warm-500"
                    : "text-cream-400"
                }`}
              >
                {d}s
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PARAMS.map((p) => (
            <tr key={p.name} className="border-b border-cream-50">
              <td className="py-2 text-cream-700">{p.name}</td>
              {DURATIONS.map((d) => {
                const level = getLevel(p, d);
                return (
                  <td key={d} className="text-center py-2">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${
                        LEVEL_COLORS[level]
                      } ${d === currentDuration ? "ring-1 ring-warm-300" : ""}`}
                    >
                      {level}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
