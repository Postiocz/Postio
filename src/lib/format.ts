/** Krácené formátování počtů (1530 → 1.5k, 2500000 → 2.5M). */
export function formatCompactNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const v = n / 1000;
    return `${Number.isInteger(v) || v >= 10 ? Math.round(v) : v.toFixed(1)}k`;
  }
  const v = n / 1_000_000;
  return `${Number.isInteger(v) || v >= 10 ? Math.round(v) : v.toFixed(1)}M`;
}