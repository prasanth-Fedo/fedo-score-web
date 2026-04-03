"use client";

import { useEffect, useRef } from "react";

interface ProgressRingProps {
  value: number; // 0-100 or 0-1000 etc
  max: number;
  size?: number; // px
  strokeWidth?: number;
  color?: string; // stroke color
  trackColor?: string;
  label?: string;
  showValue?: boolean;
  animated?: boolean;
  className?: string;
}

export default function ProgressRing({
  value,
  max,
  size = 80,
  strokeWidth = 6,
  color = "#FB923C",
  trackColor = "#FED7AA",
  label,
  showValue = true,
  animated = true,
  className = "",
}: ProgressRingProps) {
  const pathRef = useRef<SVGCircleElement>(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const offset = circumference * (1 - progress);

  useEffect(() => {
    if (!animated || !pathRef.current) return;
    const el = pathRef.current;
    el.style.strokeDashoffset = `${circumference}`;
    // Trigger reflow
    el.getBoundingClientRect();
    el.style.transition = "stroke-dashoffset 1.2s ease-out";
    el.style.strokeDashoffset = `${offset}`;
  }, [animated, circumference, offset]);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          ref={pathRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? circumference : offset}
        />
      </svg>
      {(showValue || label) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showValue && (
            <span className="font-display font-bold text-sm text-cream-800">
              {Math.round(value)}
            </span>
          )}
          {label && (
            <span className="text-[10px] text-cream-500">{label}</span>
          )}
        </div>
      )}
    </div>
  );
}
