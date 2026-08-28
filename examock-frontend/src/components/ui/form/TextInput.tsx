// src/components/ui/form/TextInput.tsx
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../../utils/cn";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ className, error, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 transition-colors",
          error
            ? "border-red-300 focus:ring-red-200"
            : "border-gray-300 focus:ring-indigo-200 focus:border-indigo-400",
          className
        )}
        {...props}
      />
    );
  }
);

export default TextInput;
