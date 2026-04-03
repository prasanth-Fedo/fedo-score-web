"use client";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export default function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i < currentStep
              ? "bg-warm-400 w-6"
              : i === currentStep
                ? "bg-warm-500 w-8"
                : "bg-cream-200 w-4"
          }`}
        />
      ))}
    </div>
  );
}
