"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Spring-like easing (no linear / ease-in-out) per high-end skill.
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface FaqItem {
  q: string;
  a: string;
}

// Accordion for landing FAQ. Expand/collapse animates height + opacity via
// Framer Motion; collapses to an instant toggle under prefers-reduced-motion.
// First item is open by default for a less empty initial state.
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = React.useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={i}
            className="overflow-hidden rounded-[20px] border border-border bg-card/40 backdrop-blur-xl"
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
            >
              <span className="text-base font-medium text-foreground">{item.q}</span>
              <ChevronDown
                className={cn(
                  "size-5 flex-shrink-0 text-muted-foreground transition-transform duration-300",
                  isOpen && "rotate-180"
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduce ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground sm:px-6">
                    {item.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
