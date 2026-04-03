"use client";

import Card from "@/components/ui/Card";

interface GenderPickerProps {
  value: number; // 1=M, 2=F
  onChange: (v: number) => void;
}

const GENDERS = [
  { label: "Male", value: 1, icon: "\u2642\uFE0F", color: "bg-sky-50" },
  { label: "Female", value: 2, icon: "\u2640\uFE0F", color: "bg-pink-50" },
];

export default function GenderPicker({ value, onChange }: GenderPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {GENDERS.map((g) => {
        const isActive = value === g.value;
        return (
          <Card
            key={g.value}
            variant="colored"
            color={
              isActive
                ? "bg-warm-100 border-warm-400 border-2"
                : `${g.color} border border-cream-200`
            }
            className={`p-6 text-center transition-all duration-200 ${
              isActive ? "scale-[1.02] shadow-md" : "hover:scale-[1.01]"
            }`}
            onClick={() => onChange(g.value)}
          >
            <span className="text-4xl block mb-3">{g.icon}</span>
            <p
              className={`font-display font-semibold ${
                isActive ? "text-warm-600" : "text-cream-700"
              }`}
            >
              {g.label}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
