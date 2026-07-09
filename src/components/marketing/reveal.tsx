"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

// Spring-like easing (no linear / ease-in-out) per high-end skill.
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Reveal-on-scroll wrapper: gentle fade-up + blur, collapses to static
// under prefers-reduced-motion. Isolates motion in a client leaf.
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
