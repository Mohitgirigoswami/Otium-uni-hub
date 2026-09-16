import * as React from "react";
import { Card, CardProps } from "./card";

export function GlassCard({ className = "", ...props }: CardProps) {
  return <Card className={`bg-card/85 backdrop-blur-md ${className}`} {...props} />;
}
