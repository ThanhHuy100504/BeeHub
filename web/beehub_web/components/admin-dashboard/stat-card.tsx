import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/admin/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  loading?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  delta,
  deltaLabel,
  icon: Icon,
  iconColor,
  iconBg,
  loading,
  className,
}: StatCardProps) {
  const isPositive = delta !== undefined && delta >= 0;

  if (loading) {
    return (
      <div
        className={cn("rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm", className)}
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-start justify-between mb-2.5 sm:mb-4">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl animate-pulse" style={{ backgroundColor: "var(--border)" }} />
          <div className="w-12 sm:w-16 h-5 rounded animate-pulse" style={{ backgroundColor: "var(--border)" }} />
        </div>
        <div className="w-20 sm:w-24 h-7 sm:h-8 rounded animate-pulse mb-1" style={{ backgroundColor: "var(--border)" }} />
        <div className="w-28 sm:w-32 h-3.5 sm:h-4 rounded animate-pulse" style={{ backgroundColor: "var(--border)" }} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-start justify-between mb-2.5 sm:mb-4">
        <div
          className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg ?? "var(--primary-tint)" }}
        >
          <Icon
            className="w-4 h-4 sm:w-5 sm:h-5"
            style={{ color: iconColor ?? "var(--primary)" }}
          />
        </div>
        {delta !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-[11px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full shrink-0",
              isPositive
                ? "text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30"
                : "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30"
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(delta).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="text-base sm:text-2xl font-bold mb-0.5 truncate" style={{ color: "var(--text)" }}>
        {value}
      </div>
      <div className="text-xs sm:text-sm line-clamp-1" style={{ color: "var(--muted)" }} title={title}>
        {title}
        {deltaLabel && <span className="hidden sm:inline"> · {deltaLabel}</span>}
      </div>
    </div>
  );
}
