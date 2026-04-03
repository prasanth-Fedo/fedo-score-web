"use client";

import { useRef, useEffect, useCallback } from "react";

interface RulerPickerProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit: string;
  formatLabel?: (v: number) => string;
}

export default function RulerPicker({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  formatLabel,
}: RulerPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const totalSteps = Math.ceil((max - min) / step);
  const TICK_WIDTH = 12; // px per tick
  const centerOffset = 150; // half of visible area

  const scrollToValue = useCallback(
    (v: number, smooth = false) => {
      const container = containerRef.current;
      if (!container) return;
      const idx = (v - min) / step;
      const scrollPos = idx * TICK_WIDTH - centerOffset + TICK_WIDTH / 2;
      container.scrollTo({ left: scrollPos, behavior: smooth ? "smooth" : "auto" });
    },
    [min, step]
  );

  useEffect(() => {
    scrollToValue(value);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleScroll() {
    const container = containerRef.current;
    if (!container) return;
    const scrollCenter = container.scrollLeft + centerOffset;
    const idx = Math.round(scrollCenter / TICK_WIDTH);
    const newVal = Math.min(max, Math.max(min, min + idx * step));
    if (newVal !== value) onChange(newVal);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Current Value */}
      <div className="text-center">
        <span className="font-display text-5xl font-bold text-cream-800">
          {formatLabel ? formatLabel(value) : value}
        </span>
        <span className="text-cream-400 text-lg ml-1">{unit}</span>
      </div>

      {/* Indicator */}
      <div className="w-0.5 h-4 bg-warm-500 rounded-full" />

      {/* Ruler */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-[300px] overflow-x-auto scrollbar-hide"
        style={{ scrollSnapType: "x mandatory" }}
      >
        <div
          className="flex items-end"
          style={{ width: (totalSteps + 1) * TICK_WIDTH + centerOffset * 2, paddingLeft: centerOffset, paddingRight: centerOffset }}
        >
          {Array.from({ length: totalSteps + 1 }, (_, i) => {
            const v = min + i * step;
            const isMajor = v % (step * 10) === 0 || v % 10 === 0;
            return (
              <div
                key={i}
                className="flex flex-col items-center"
                style={{ width: TICK_WIDTH, scrollSnapAlign: "center", flexShrink: 0 }}
              >
                <div
                  className={`w-0.5 rounded-full ${
                    isMajor ? "h-6 bg-cream-400" : "h-3 bg-cream-200"
                  }`}
                />
                {isMajor && (
                  <span className="text-[9px] text-cream-400 mt-1">{v}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
