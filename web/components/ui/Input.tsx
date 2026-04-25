import * as React from "react";
import { cn } from "@/lib/cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm",
        "placeholder:text-muted",
        "focus:border-fg focus:outline-none focus:ring-1 focus:ring-accent/30",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[88px] w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm",
        "placeholder:text-muted",
        "focus:border-fg focus:outline-none focus:ring-1 focus:ring-accent/30",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("block font-mono text-[11px] uppercase tracking-wide text-muted", className)}
      {...props}
    />
  ),
);
Label.displayName = "Label";
