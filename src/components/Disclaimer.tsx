import { Info } from "lucide-react";

import { DISCLAIMER } from "@/lib/planner/config";
import { cn } from "@/lib/utils";

export function Disclaimer({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <aside
      className={cn(
        "flex gap-2.5 rounded-lg border border-border bg-surface/70 px-4 py-3 text-muted-foreground",
        compact ? "text-[0.72rem] leading-relaxed" : "text-xs leading-relaxed",
        className,
      )}
      aria-label="Educational disclaimer"
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <p>{DISCLAIMER}</p>
    </aside>
  );
}
