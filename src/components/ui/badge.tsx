import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/15 text-primary border border-primary/20",
        secondary:
          "border-border bg-secondary text-secondary-foreground border",
        outline:
          "border-border text-foreground border",
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive border",
        danger:
          "border-destructive/20 bg-destructive/10 text-destructive border",
        success:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border",
        warning:
          "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 border",
        info:
          "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400 border",
        accent:
          "border-accent/20 bg-accent/15 text-accent-foreground border",
        primary:
          "border-transparent bg-primary/15 text-primary border border-primary/20",
        brand:
          "border-transparent bg-primary/15 text-primary border border-primary/20",
        neutral:
          "border-border bg-secondary text-secondary-foreground border",
      },
      size: {
        sm: "px-2 py-0.5 text-[11px] rounded",
        md: "px-2.5 py-1 text-xs rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
