import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("font-bold tracking-tighter text-foreground", className)}>
      <span className="text-primary">P</span>ostio
    </div>
  );
}
