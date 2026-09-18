import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { explainPlan } from "@/lib/api/explain.functions";
import type { PlannerAnalysis } from "@/lib/planner/types";

export function PlanExplanation({ analysis }: { analysis: PlannerAnalysis }) {
  const run = useServerFn(explainPlan);
  const mutation = useMutation({
    mutationFn: () =>
      run({
        data: {
          currency: analysis.currency,
          totalIncome: analysis.totalIncome,
          totalExpenses: analysis.totalExpenses,
          monthlySurplus: analysis.monthlySurplus,
          accessibleSavings: analysis.accessibleSavings,
          emergencyCoverageMonths: analysis.emergencyFund.coverageMonths,
          emergencyTargetMonths: analysis.emergencyFund.targetMonths,
          hasExpensiveDebt: analysis.debt.hasExpensiveDebt,
          riskProfile: analysis.riskProfile,
          primaryTitle: analysis.primaryAction.title,
          primaryWhy: analysis.primaryAction.why,
          primaryHow: analysis.primaryAction.how,
          primaryAfterThis: analysis.primaryAction.afterThis,
        },
      }),
  });

  const unavailable = mutation.isSuccess && !mutation.data.available;

  return (
    <section className="panel p-5" aria-labelledby="explain-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="explain-heading" className="font-display text-lg font-semibold">
            Explain this in simpler words
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Rewrites the plan above in everyday language. It never changes what the plan recommends.
          </p>
        </div>
        <Button variant="subtle" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          <Sparkles className="mr-2 h-4 w-4" aria-hidden />
          {mutation.isPending ? "Writing…" : "Explain my plan"}
        </Button>
      </div>

      {mutation.data?.explanation ? (
        <div className="mt-4 space-y-3 text-sm leading-relaxed">
          {mutation.data.explanation.split(/\n{2,}/).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      ) : null}

      {unavailable ? (
        <p className="mt-4 text-sm text-muted-foreground">
          The simpler-words explanation isn't switched on right now. Your plan above is complete and
          unaffected.
        </p>
      ) : null}

      {mutation.isError ? (
        <p className="mt-4 text-sm text-muted-foreground">
          That didn't work just now. Your plan above is unaffected — you can try again in a moment.
        </p>
      ) : null}
    </section>
  );
}
