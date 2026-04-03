"use client";

interface UnitToggleProps {
  options: [string, string]; // e.g. ["cm", "ft'in\""]
  value: number; // 0 or 1
  onChange: (v: number) => void;
}

export default function UnitToggle({ options, value, onChange }: UnitToggleProps) {
  return (
    <div className="inline-flex rounded-full bg-cream-100 p-1">
      {options.map((opt, i) => (
        <button
          key={opt}
          onClick={() => onChange(i)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
            value === i
              ? "bg-white text-warm-600 shadow-sm"
              : "text-cream-500 hover:text-cream-700"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
