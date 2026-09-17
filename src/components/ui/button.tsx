"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { Spinner, type SpinnerVariant } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium text-xs sm:text-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none fluid-interactive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:opacity-90 shadow-sm border border-transparent",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
        outline:
          "border border-border bg-card/60 text-foreground hover:bg-secondary/80 hover:text-foreground",
        ghost:
          "text-foreground hover:bg-secondary/80 hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        danger:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        accent:
          "bg-accent text-accent-foreground hover:opacity-90 shadow-sm",
        primary:
          "bg-primary text-primary-foreground hover:opacity-90 shadow-sm border border-transparent",
        brand:
          "bg-primary text-primary-foreground hover:opacity-90 shadow-sm border border-transparent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 rounded-md px-3 text-xs",
        md: "h-9 rounded-lg px-4 py-2",
        lg: "h-11 rounded-lg px-6 text-base font-semibold",
        icon: "h-9 w-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  spinnerVariant?: SpinnerVariant;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      isLoading = false,
      spinnerVariant = "orbit",
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Spinner
            variant={spinnerVariant}
            size="xs"
            colorClassName="text-current"
            className="mr-2 flex-shrink-0"
          />
        ) : leftIcon ? (
          <span className="mr-2 inline-flex items-center flex-shrink-0">
            {leftIcon}
          </span>
        ) : null}
        {children}
        {!isLoading && rightIcon ? (
          <span className="ml-2 inline-flex items-center flex-shrink-0">
            {rightIcon}
          </span>
        ) : null}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
