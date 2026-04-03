"use client";

import { type ReactNode } from "react";

type BadgeStatus = "good" | "fair" | "warning" | "danger" | "neutral";

interface BadgeProps {
  children: ReactNode;
  status?: BadgeStatus;
  className?: string;
}

const statusStyles: Record<BadgeStatus, string> = {
  good: "badge-good",
  fair: "badge-fair",
  warning: "badge-warning",
  danger: "badge-danger",
  neutral: "bg-cream-100 text-cream-600 border border-cream-200",
};

export default function Badge({
  children,
  status = "neutral",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${statusStyles[status]} ${className}`}
    >
      {children}
    </span>
  );
}
