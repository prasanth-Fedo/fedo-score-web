"use client";

import Card from "@/components/ui/Card";

export interface OptionItem {
  label: string;
  value: number;
  icon?: string; // emoji or text
  color?: string; // bg gradient class
}

interface OptionCardsProps {
  options: OptionItem[];
  selected: number;
  onChange: (v: number) => void;
}

export default function OptionCards({ options, selected, onChange }: OptionCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((opt) => {
        const isActive = selected === opt.value;
        return (
          <Card
            key={opt.value}
            variant="colored"
            color={
              isActive
                ? "bg-warm-100 border-warm-400 border-2"
                : opt.color || "bg-cream-50 border border-cream-200"
            }
            className={`p-4 text-center transition-all duration-200 ${
              isActive ? "scale-[1.02] shadow-md" : "hover:scale-[1.01]"
            }`}
            onClick={() => onChange(opt.value)}
          >
            {opt.icon && (
              <span className="text-2xl block mb-2">{opt.icon}</span>
            )}
            <p
              className={`font-display font-semibold text-sm ${
                isActive ? "text-warm-600" : "text-cream-700"
              }`}
            >
              {opt.label}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
