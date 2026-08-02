import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ElementType;
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[20px] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#09090b]/80 p-6 backdrop-blur-xl",
        className
      )}
    >
      {/* Glow effect - light: very subtle, dark: original */}
      <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-indigo-500/5 dark:bg-purple-600/10 blur-[60px]" />

      <div className="relative flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-slate-500 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
          {change && (
            <p className="text-xs text-slate-400 dark:text-gray-500">{change}</p>
          )}
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-slate-100 dark:bg-white/5">
          <Icon className="h-6 w-6 text-indigo-600 dark:text-purple-400" />
        </div>
      </div>
    </div>
  );
}
