"use client";

import Card from "@/components/ui/Card";

export interface ToggleItem {
  label: string;
  value: number;
  icon?: string;
}

interface ToggleCardsProps {
  items: ToggleItem[];
  selected: number[];
  onChange: (selected: number[]) => void;
}

export default function ToggleCards({ items, selected, onChange }: ToggleCardsProps) {
  function toggle(val: number) {
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val));
    } else {
      onChange([...selected, val]);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const isActive = selected.includes(item.value);
        return (
          <Card
            key={item.value}
            variant="glass"
            className={`p-4 flex items-center gap-3 transition-all duration-200 ${
              isActive
                ? "border-warm-400 border-2 bg-warm-50/60"
                : "hover:bg-cream-50"
            }`}
            onClick={() => toggle(item.value)}
          >
            {/* Checkbox */}
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                isActive
                  ? "bg-warm-400 text-white"
                  : "bg-cream-100 border border-cream-300"
              }`}
            >
              {isActive && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M3 7l3 3 5-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>

            {item.icon && <span className="text-lg">{item.icon}</span>}
            <span
              className={`font-body text-sm ${
                isActive ? "text-warm-700 font-medium" : "text-cream-700"
              }`}
            >
              {item.label}
            </span>
          </Card>
        );
      })}

      {selected.length === 0 && (
        <p className="text-cream-400 text-xs text-center mt-1">
          Select all that apply, or tap Next to skip
        </p>
      )}
    </div>
  );
}
