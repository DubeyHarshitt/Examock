// src/components/ui/form/TextArea.tsx
import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../../../utils/cn";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea({ className, error, ...props }, ref) {
    return (
      <textarea
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

export default TextArea;
