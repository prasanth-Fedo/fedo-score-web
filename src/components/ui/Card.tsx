"use client";

import { type ReactNode } from "react";

type CardVariant = "glass" | "elevated" | "colored";

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  className?: string;
  color?: string; // bg class for colored variant
  onClick?: () => void;
  style?: React.CSSProperties;
}

const variantStyles: Record<CardVariant, string> = {
  glass: "glass-card rounded-card",
  elevated: "glass-elevated rounded-card",
  colored: "glass-colored rounded-card",
};

export default function Card({
  children,
  variant = "glass",
  className = "",
  color,
  onClick,
  style,
}: CardProps) {
  return (
    <div
      className={`${variantStyles[variant]} ${color ?? ""} ${className} ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
}
