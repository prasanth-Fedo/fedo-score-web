"use client";

import { type ReactNode, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "warm" | "outline" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  warm: "btn-warm",
  outline: "btn-warm-outline",
  ghost: "btn-ghost",
};

export default function Button({
  children,
  variant = "warm",
  fullWidth = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${variantStyles[variant]} ${fullWidth ? "w-full" : ""} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
