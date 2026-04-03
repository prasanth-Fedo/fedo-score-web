"use client";

interface NumberStepperProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

export default function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: NumberStepperProps) {
  return (
    <div className="flex items-center justify-center gap-6">
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-14 h-14 rounded-full bg-cream-100 text-cream-600 text-2xl font-bold
                   hover:bg-cream-200 active:bg-cream-300 transition-colors
                   flex items-center justify-center"
      >
        &minus;
      </button>

      <div className="text-center min-w-[100px]">
        <span className="font-display text-5xl font-bold text-cream-800">
          {value}
        </span>
        {unit && (
          <span className="text-cream-400 text-lg ml-1">{unit}</span>
        )}
      </div>

      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-14 h-14 rounded-full bg-cream-100 text-cream-600 text-2xl font-bold
                   hover:bg-cream-200 active:bg-cream-300 transition-colors
                   flex items-center justify-center"
      >
        +
      </button>
    </div>
  );
}
