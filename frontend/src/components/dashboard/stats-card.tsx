/**
 * ClipAI — Stats Card Component
 *
 * Minimal stat cards for the dashboard overview section.
 */

interface StatsCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ElementType;
}

export function StatsCard({
  label,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
}: StatsCardProps) {
  const changeColor =
    changeType === "positive"
      ? "text-[#10b981]"
      : changeType === "negative"
        ? "text-[#ef4444]"
        : "text-[#71717a]";

  return (
    <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-5 transition-colors hover:border-[#3f3f46]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[#71717a] uppercase tracking-wider">
          {label}
        </p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#27272a]">
          <Icon className="h-4 w-4 text-[#a1a1aa]" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-white">
        {value}
      </p>
      {change && (
        <p className={`mt-1 text-xs font-medium ${changeColor}`}>
          {change}
        </p>
      )}
    </div>
  );
}
