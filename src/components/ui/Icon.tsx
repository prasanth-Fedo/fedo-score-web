"use client";

type IconType =
  | "heart"
  | "lungs"
  | "bp"
  | "glucose"
  | "brain"
  | "wave"
  | "breath"
  | "smoke"
  | "stress"
  | "autonomic"
  | "hemoglobin"
  | "sleep"
  | "exercise"
  | "drink"
  | "clock";

interface IconProps {
  type: IconType;
  size?: number;
  className?: string;
}

const icons: Record<IconType, string> = {
  heart:
    "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  lungs:
    "M12 2C12 2 8 6 8 10v6c0 2-1 4-3 5h14c-2-1-3-3-3-5v-6c0-4-4-8-4-8z",
  bp:
    "M12 2v6m0 0l3-3m-3 3L9 5M5 12h14M5 12c0 3.87 3.13 7 7 7s7-3.13 7-7M5 12c0-3.87 3.13-7 7-7s7 3.13 7 7",
  glucose:
    "M12 2L8 6v5c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2V6l-4-4zM10 14v6c0 1.1.9 2 2 2s2-.9 2-2v-6",
  brain:
    "M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6l4 5 4-5c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z",
  wave:
    "M2 12h3l2-4 3 8 3-8 2 4h3",
  breath:
    "M12 3v18M6 9c0-3.31 2.69-6 6-6s6 2.69 6 6M6 15c0 3.31 2.69 6 6 6s6-2.69 6-6",
  smoke:
    "M12 2c-1 4 1 6 0 10M8 2c-1 4 1 6 0 10M16 2c-1 4 1 6 0 10M4 16h16v4H4z",
  stress:
    "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  autonomic:
    "M4.93 4.93l4.24 4.24M19.07 4.93l-4.24 4.24M12 2v4M12 18v4M2 12h4M18 12h4M4.93 19.07l4.24-4.24M19.07 19.07l-4.24-4.24",
  hemoglobin:
    "M12 2C8 2 4 6 4 10c0 6 8 12 8 12s8-6 8-12c0-4-4-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z",
  sleep:
    "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  exercise:
    "M13 4v2l3 3-3 3v2h6V4h-6zM5 4v10h6V4H5zm6 14H5v2h6v-2zm8-2h-6v2h6v-2z",
  drink:
    "M8 2h8l-1 9H9L8 2zM6 22h12M9 11l-1 11M15 11l1 11",
  clock:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 5v5l3 3",
};

export default function Icon({ type, size = 20, className = "" }: IconProps) {
  const path = icons[type];
  if (!path) return null;

  // Some icons use stroke (line-based), some use fill
  const strokeIcons: IconType[] = ["bp", "wave", "breath", "autonomic", "clock"];
  const isStroke = strokeIcons.includes(type);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isStroke ? "none" : "currentColor"}
      stroke={isStroke ? "currentColor" : "none"}
      strokeWidth={isStroke ? 2 : 0}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={path} />
    </svg>
  );
}
