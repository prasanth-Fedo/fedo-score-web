"use client";

import Card from "@/components/ui/Card";
import AnimatedNumber from "@/components/ui/AnimatedNumber";

interface FedoScoreHeroProps {
  score: number;
  biologicalAge: number;
  chronologicalAge: number;
  bioAgeGap: number;
  improvementTip?: { factor: string; delta: number } | null;
}

function scoreColor(score: number): string {
  if (score >= 700) return "from-health-good to-green-400";
  if (score >= 400) return "from-warm-400 to-warm-500";
  return "from-health-warning to-red-400";
}

function scoreLabel(score: number): string {
  if (score >= 800) return "Excellent";
  if (score >= 700) return "Good";
  if (score >= 500) return "Fair";
  if (score >= 300) return "Below Average";
  return "Needs Attention";
}

export default function FedoScoreHero({
  score,
  biologicalAge,
  chronologicalAge,
  bioAgeGap,
  improvementTip,
}: FedoScoreHeroProps) {
  return (
    <Card
      variant="elevated"
      className="p-6 relative overflow-hidden animate-fade-up"
    >
      {/* Gradient accent border */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${scoreColor(score)}`}
      />

      <div className="text-center">
        <p className="text-cream-400 text-sm font-medium mb-1">Your FedoScore</p>

        {/* Big animated score */}
        <div className="relative inline-block">
          <AnimatedNumber
            value={score}
            duration={1500}
            className={`font-display text-6xl font-bold bg-gradient-to-r ${scoreColor(score)} bg-clip-text text-transparent`}
          />
          <span className="text-cream-300 text-lg font-light ml-1">/1000</span>
        </div>

        <p className="text-cream-500 text-sm mt-1 font-medium">
          {scoreLabel(score)}
        </p>

        {/* Bio Age Row */}
        <div className="flex items-center justify-center gap-6 mt-5 py-3 border-t border-cream-100">
          <div className="text-center">
            <p className="text-cream-400 text-xs">Bio Age</p>
            <AnimatedNumber
              value={biologicalAge}
              className="font-display text-2xl font-bold text-cream-800"
            />
          </div>
          <div className="text-center">
            <p className="text-cream-400 text-xs">Actual Age</p>
            <span className="font-display text-2xl font-bold text-cream-500">
              {chronologicalAge}
            </span>
          </div>
          <div className="text-center">
            <p className="text-cream-400 text-xs">Gap</p>
            <span
              className={`font-display text-2xl font-bold ${
                bioAgeGap <= 0 ? "text-health-good" : "text-health-warning"
              }`}
            >
              {bioAgeGap > 0 ? "+" : ""}
              {bioAgeGap}
            </span>
          </div>
        </div>

        {/* Improvement tip */}
        {improvementTip && (
          <div className="mt-3 px-4 py-2 bg-warm-50 rounded-button">
            <p className="text-warm-600 text-xs font-medium">
              Top improvement: {improvementTip.factor.replace("_", " ")} (+
              {improvementTip.delta} pts)
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
