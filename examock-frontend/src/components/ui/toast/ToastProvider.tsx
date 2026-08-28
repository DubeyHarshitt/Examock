// src/components/ui/toast/ToastProvider.tsx
import { useCallback, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "../../../utils/cn";
import { ToastContext, type ToastVariant } from "./toast-context";

interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
}

let nextId = 0;

const iconMap = {
  success: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  error: <AlertCircle className="w-4 h-4 text-red-500" />,
  info: <Info className="w-4 h-4 text-blue-500" />,
};

const barClasses: Record<ToastVariant, string> = {
  success: "bg-green-500",
  error: "bg-red-500",
  info: "bg-blue-500",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = ++nextId;
      setToasts((t) => [...t, { id, variant, message }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider
      value={{
        toast,
        success: (m) => toast("success", m),
        error: (m) => toast("error", m),
        info: (m) => toast("info", m),
      }}
    >
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="relative overflow-hidden bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 flex items-start gap-3"
          >
            <span
              className={cn("absolute left-0 top-0 bottom-0 w-1", barClasses[t.variant])}
            />
            <span className="mt-0.5 shrink-0">{iconMap[t.variant]}</span>
            <p className="text-xs text-gray-700 flex-1 break-words">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="text-gray-400 hover:text-gray-600 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
