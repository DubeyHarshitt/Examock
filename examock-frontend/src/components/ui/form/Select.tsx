// src/components/ui/form/Select.tsx
import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "../../../utils/cn";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
  children?: React.ReactNode;
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, options, children, error, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          "w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 transition-colors",
          error
            ? "border-red-300 focus:ring-red-200"
            : "border-gray-300 focus:ring-indigo-200 focus:border-indigo-400",
          className
        )}
        {...props}
      >
        {options
          ? options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          : children}
      </select>
    );
  }
);

export default Select;
