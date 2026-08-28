// src/components/ui/toast/toast-context.ts
import { createContext, useContext } from "react";
import type { ReactNode } from "react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastContextValue {
  toast: (variant: ToastVariant, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

export type { ReactNode };
