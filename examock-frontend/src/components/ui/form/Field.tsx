// src/components/ui/form/Field.tsx
import type { ReactNode } from "react";

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}

/** Label + input + error wrapper for form fields. */
export function Field({ label, error, hint, children, htmlFor }: FieldProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-xs font-semibold text-gray-700"
        >
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-[11px] text-gray-400">{hint}</p>}
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

export default Field;
