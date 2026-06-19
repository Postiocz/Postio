import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("font-bold tracking-tighter text-foreground", className)}>
      <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">P</span>ostio
    </div>
  );
}
