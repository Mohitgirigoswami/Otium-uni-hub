"use client";

import React from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./Button";

interface SubmitButtonProps {
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "glass" | "brand";
  size?: "sm" | "md" | "lg";
  isSubmitting?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function SubmitButton({
  children,
  loadingText = "Submitting...",
  className = "",
  variant = "brand",
  size = "md",
  isSubmitting: manualLoading = false,
  disabled = false,
  leftIcon,
  rightIcon,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isLoading = pending || manualLoading;

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      isLoading={isLoading}
      disabled={disabled || isLoading}
      className={className}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
    >
      {isLoading ? loadingText : children}
    </Button>
  );
}
