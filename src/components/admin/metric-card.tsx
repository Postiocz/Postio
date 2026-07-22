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
        "relative overflow-hidden rounded-[20px] border border-white/10 bg-[#09090b]/80 p-6 backdrop-blur-xl",
        className
      )}
    >
      {/* Glow effect */}
      <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-purple-600/10 blur-[60px]" />

      <div className="relative flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {change && (
            <p className="text-xs text-gray-500">{change}</p>
          )}
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-white/5">
          <Icon className="h-6 w-6 text-purple-400" />
        </div>
      </div>
    </div>
  );
}
