// src/components/ui/Alert.tsx
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "../../utils/cn";

type AlertVariant = "error" | "success" | "info" | "warning";

interface AlertProps {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
}

const styles: Record<AlertVariant, { box: string; icon: ReactNode }> = {
  error: {
    box: "bg-red-50 border-red-200 text-red-700",
    icon: <XCircle className="w-4 h-4 text-red-500" />,
  },
  success: {
    box: "bg-emerald-50 border-emerald-200 text-emerald-700",
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  },
  info: {
    box: "bg-sky-50 border-sky-200 text-sky-700",
    icon: <Info className="w-4 h-4 text-sky-500" />,
  },
  warning: {
    box: "bg-amber-50 border-amber-200 text-amber-700",
    icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  },
};

export function Alert({ variant = "info", children, className }: AlertProps) {
  const s = styles[variant];
  return (
    <div
      className={cn(
        "px-3 py-2 rounded-lg border text-xs font-medium flex items-start gap-2",
        s.box,
        className
      )}
    >
      <span className="mt-0.5 shrink-0">{s.icon}</span>
      <span className="flex-1">{children}</span>
    </div>
  );
}

export default Alert;
