import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium font-mono uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "border-border bg-surface text-fg",
        accent: "border-accent/40 bg-accent/10 text-accent",
        onchain: "border-green-400/40 bg-green-400/10 text-green-400",
        muted: "border-border bg-transparent text-muted",
        warn: "border-yellow-300/40 bg-yellow-300/10 text-yellow-300",
        kind: "border-blue-400/40 bg-blue-400/10 text-blue-300",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  ),
);
Badge.displayName = "Badge";
