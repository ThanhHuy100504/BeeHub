import { cn } from "@/lib/admin/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-6", className)}>
      <div className="min-w-0">
        <h1
          className="text-xl sm:text-2xl font-bold tracking-tight"
          style={{ color: "var(--text)" }}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-xs sm:text-sm" style={{ color: "var(--muted)" }}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 w-full sm:w-auto">{action}</div>}
    </div>
  );
}
