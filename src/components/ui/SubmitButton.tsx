"use client";

import React from "react";
import { useFormStatus } from "react-dom";
import { Button, ButtonProps } from "./button";

interface SubmitButtonProps extends ButtonProps {
  loadingText?: string;
  isSubmitting?: boolean;
}

export function SubmitButton({
  children,
  loadingText = "Processing...",
  isSubmitting = false,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isLoading = pending || isSubmitting;

  return (
    <Button
      type="submit"
      disabled={isLoading || props.disabled}
      isLoading={isLoading}
      {...props}
    >
      {isLoading ? loadingText : children}
    </Button>
  );
}
