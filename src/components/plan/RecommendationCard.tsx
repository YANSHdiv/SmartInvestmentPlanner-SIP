import { ArrowRight, CheckCircle2, HelpCircle, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import type { Recommendation } from "@/lib/planner/types";
import { cn } from "@/lib/utils";

const urgencyLabel: Record<Recommendation["urgency"], string> = {
  critical: "Do this first",
  high: "High priority",
  medium: "Next up",
  low: "Later",
};

export function RecommendationCard({
  recommendation,
  currency,
  primary = false,
  index,
}: {
  recommendation: Recommendation;
  currency: string;
  primary?: boolean;
  index?: number;
}) {
  return (
    <article
      className={cn(
        "panel p-5",
        primary &&
          "border-accent/50 bg-accent/5 shadow-[0_1px_0_0_var(--color-accent)] ring-1 ring-accent/20",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {primary ? (
          <Badge className="bg-accent text-accent-foreground hover:bg-accent">
            Your next action
          </Badge>
        ) : (
          <Badge variant="secondary">
            {index !== undefined ? `Step ${index + 1} · ` : ""}
            {urgencyLabel[recommendation.urgency]}
          </Badge>
        )}
        {recommendation.suggestedMonthlyAmount ? (
          <span className="text-xs text-muted-foreground">
            Suggested: about {formatMoney(recommendation.suggestedMonthlyAmount, currency)} a month
            (estimate)
          </span>
        ) : null}
      </div>

      <h3
        className={cn(
          "mt-3 font-display font-semibold",
          primary ? "text-xl sm:text-2xl" : "text-lg",
        )}
      >
        {recommendation.title}
      </h3>

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="flex items-center gap-1.5 font-semibold">
            <HelpCircle className="h-3.5 w-3.5 text-primary" aria-hidden />
            Why this
          </dt>
          <dd className="mt-1 text-muted-foreground">{recommendation.why}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 font-semibold">
            <Wrench className="h-3.5 w-3.5 text-primary" aria-hidden />
            Next step
          </dt>
          <dd className="mt-1 text-muted-foreground">{recommendation.how}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 font-semibold">
            <ArrowRight className="h-3.5 w-3.5 text-primary" aria-hidden />
            After that
          </dt>
          <dd className="mt-1 text-muted-foreground">{recommendation.afterThis}</dd>
        </div>
      </dl>
    </article>
  );
}

export function JourneyTracker({
  stages,
}: {
  stages: { key: string; label: string; state: string }[];
}) {
  return (
    <ol className="space-y-2.5">
      {stages.map((stage) => (
        <li key={stage.key} className="flex items-start gap-3">
          <span
            aria-hidden
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[0.6rem] font-bold",
              stage.state === "done" && "border-primary bg-primary text-primary-foreground",
              stage.state === "current" && "border-accent bg-accent text-accent-foreground",
              stage.state === "upcoming" && "border-border bg-surface text-muted-foreground",
            )}
          >
            {stage.state === "done" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
          </span>
          <div>
            <p
              className={cn(
                "text-sm font-medium",
                stage.state === "current" && "font-semibold",
                stage.state === "upcoming" && "text-muted-foreground",
              )}
            >
              {stage.label}
            </p>
            {stage.state === "current" ? (
              <p className="text-xs font-semibold text-accent">You are here</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
