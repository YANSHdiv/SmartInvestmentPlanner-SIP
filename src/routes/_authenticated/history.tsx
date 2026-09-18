import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { toUserMessage } from "@/lib/errors";

import { AppShell } from "@/components/layout/AppShell";
import { StatTile } from "@/components/plan/pieces";
import { RecommendationCard } from "@/components/plan/RecommendationCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { deletePlan, listPlans, savePlan } from "@/lib/api/finance.functions";
import { formatMoney, formatMonths } from "@/lib/format";
import type { PlannerAnalysis } from "@/lib/planner/types";

/** Saved plans keep the currency that was in use when they were created. */
const planCurrency = (plan: { snapshot: unknown }) =>
  (plan.snapshot as unknown as PlannerAnalysis | null)?.currency ?? "INR";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Plan history — Smart Investment Planner" },
      {
        name: "description",
        content: "Every plan you've saved, with the option to open one or compare two.",
      },
      { property: "og:title", content: "Plan history — Smart Investment Planner" },
      {
        property: "og:description",
        content: "See how your income, surplus and priorities have changed over time.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const queryClient = useQueryClient();
  const plansQuery = useQuery({ queryKey: ["plans"], queryFn: () => listPlans() });
  const [selected, setSelected] = useState<string[]>([]);

  const save = useMutation({
    mutationFn: () => savePlan(),
    onSuccess: () => {
      toast.success("Current plan saved.");
      void queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deletePlan({ data: { id } }),
    onSuccess: () => {
      toast.success("Plan removed.");
      setSelected([]);
      void queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
  });

  if (plansQuery.isLoading) {
    return (
      <AppShell title="Plan history">
        <LoadingState />
      </AppShell>
    );
  }
  if (plansQuery.isError || !plansQuery.data) {
    return (
      <AppShell title="Plan history">
        <ErrorState
          description={toUserMessage(plansQuery.error)}
          onRetry={() => void plansQuery.refetch()}
        />
      </AppShell>
    );
  }

  const plans = plansQuery.data;
  const chosen = plans.filter((plan) => selected.includes(plan.id));
  const comparing = chosen.length === 2;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id].slice(-2),
    );
  }

  return (
    <AppShell
      title="Plan history"
      subtitle="Saved plans, so you can see how things have changed."
      actions={
        <Button size="sm" variant="outline" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save current plan"}
        </Button>
      }
    >
      {plans.length === 0 ? (
        <EmptyState
          title="No saved plans yet"
          description="Save a plan from your dashboard and it will appear here with the date, your numbers and your main priority."
          action={<Button onClick={() => save.mutate()}>Save my current plan</Button>}
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Select two plans to compare them.</p>
          <ul className="space-y-3">
            {plans.map((plan) => {
              const analysis = plan.snapshot as unknown as PlannerAnalysis;
              const isSelected = selected.includes(plan.id);
              return (
                <li
                  key={plan.id}
                  className={`panel p-4 ${isSelected ? "border-primary/50 bg-primary/5" : ""}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display font-semibold">
                        {new Date(plan.created_at).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Main priority: {plan.primary_priority_title ?? "—"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant={isSelected ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => toggle(plan.id)}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove.mutate(plan.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-4">
                    <StatTile
                      label="Income"
                      value={formatMoney(Number(plan.total_income), analysis?.currency ?? "INR")}
                    />
                    <StatTile
                      label="Expenses"
                      value={formatMoney(Number(plan.total_expenses), analysis?.currency ?? "INR")}
                    />
                    <StatTile
                      label="Surplus"
                      value={formatMoney(Number(plan.monthly_surplus), analysis?.currency ?? "INR")}
                      tone={Number(plan.monthly_surplus) >= 0 ? "positive" : "negative"}
                    />
                    <StatTile
                      label="Goals on track"
                      value={
                        analysis?.goals?.length
                          ? `${analysis.goals.filter((goal) => goal.progressPercent >= 100).length} of ${analysis.goals.length}`
                          : "—"
                      }
                    />
                  </div>
                  {isSelected && analysis?.primaryAction ? (
                    <div className="mt-4 space-y-3">
                      <RecommendationCard
                        recommendation={analysis.primaryAction}
                        currency={analysis.currency}
                      />
                      {analysis.allocation?.length ? (
                        <p className="text-sm text-muted-foreground">
                          Suggested mix then:{" "}
                          {analysis.allocation
                            .map((slice) => `${slice.label} ${slice.percent}%`)
                            .join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {comparing ? (
            <section className="panel p-5">
              <h2 className="font-display text-lg font-semibold">Comparison</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[32rem] text-sm">
                  <caption className="sr-only">Comparison of two saved plans</caption>
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th scope="col" className="py-2 pr-4 font-semibold">
                        Measure
                      </th>
                      {chosen.map((plan) => (
                        <th key={plan.id} scope="col" className="py-2 pr-4 font-semibold">
                          {new Date(plan.created_at).toLocaleDateString()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        label: "Monthly income",
                        get: (plan: (typeof chosen)[number]) =>
                          formatMoney(Number(plan.total_income), planCurrency(plan)),
                      },
                      {
                        label: "Monthly expenses",
                        get: (plan: (typeof chosen)[number]) =>
                          formatMoney(Number(plan.total_expenses), planCurrency(plan)),
                      },
                      {
                        label: "Monthly surplus",
                        get: (plan: (typeof chosen)[number]) =>
                          formatMoney(Number(plan.monthly_surplus), planCurrency(plan)),
                      },
                      {
                        label: "Main priority",
                        get: (plan: (typeof chosen)[number]) => plan.primary_priority_title ?? "—",
                      },
                      {
                        label: "Emergency cover",
                        get: (plan: (typeof chosen)[number]) => {
                          const snapshot = plan.snapshot as unknown as PlannerAnalysis;
                          return snapshot?.emergencyFund
                            ? formatMonths(snapshot.emergencyFund.coverageMonths)
                            : "—";
                        },
                      },
                    ].map((row) => (
                      <tr key={row.label} className="border-b border-border/60">
                        <th
                          scope="row"
                          className="py-2 pr-4 text-left font-medium text-muted-foreground"
                        >
                          {row.label}
                        </th>
                        {chosen.map((plan) => (
                          <td key={plan.id} className="py-2 pr-4">
                            {row.get(plan)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
