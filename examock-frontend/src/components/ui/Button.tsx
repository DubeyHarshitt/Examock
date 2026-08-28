// src/components/ui/Button.tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 disabled:hover:bg-indigo-600",
  secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:hover:bg-gray-100",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:hover:bg-red-600",
  ghost: "text-gray-600 hover:bg-gray-100",
  outline: "border border-gray-300 text-gray-700 hover:bg-gray-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

export default Button;
