import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { StatTile } from "@/components/plan/pieces";
import { RecommendationCard } from "@/components/plan/RecommendationCard";
import { ErrorState, LoadingState } from "@/components/states";
import { toUserMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { getFinancialSnapshot, toPlannerInput } from "@/lib/api/finance.functions";
import { formatMoney, formatMonths } from "@/lib/format";
import { analysePlan } from "@/lib/planner/engine";
import type { PlannerInput } from "@/lib/planner/types";

export const Route = createFileRoute("/_authenticated/what-if")({
  head: () => ({
    meta: [
      { title: "What-if scenarios — Smart Investment Planner" },
      {
        name: "description",
        content: "Change one number and see how your plan and your next action would change.",
      },
      { property: "og:title", content: "What-if scenarios — Smart Investment Planner" },
      {
        property: "og:description",
        content: "Compare your current plan with a scenario side by side.",
      },
    ],
  }),
  component: WhatIfPage,
});

interface Scenario {
  extraInvestment: number;
  expenseChange: number;
  savingsPerMonth: number;
  goalDelta: number;
  goalDelayMonths: number;
}

const zero: Scenario = {
  extraInvestment: 0,
  expenseChange: 0,
  savingsPerMonth: 0,
  goalDelta: 0,
  goalDelayMonths: 0,
};

function applyScenario(base: PlannerInput, scenario: Scenario): PlannerInput {
  const goals = base.goals.map((goal, index) => {
    if (index !== 0) return goal;
    const nextTarget = Math.max(1, goal.target_amount + scenario.goalDelta);
    let targetDate = goal.target_date ?? null;
    if (targetDate && scenario.goalDelayMonths) {
      const date = new Date(targetDate);
      date.setMonth(date.getMonth() + scenario.goalDelayMonths);
      targetDate = date.toISOString().slice(0, 10);
    }
    return { ...goal, target_amount: nextTarget, target_date: targetDate };
  });

  return {
    ...base,
    expenses:
      scenario.expenseChange !== 0
        ? [
            ...base.expenses,
            {
              category: "other",
              monthly_amount: Math.max(0, scenario.expenseChange),
              is_essential: false,
            },
          ]
        : base.expenses,
    savings:
      scenario.savingsPerMonth > 0
        ? [...base.savings, { kind: "other", amount: scenario.savingsPerMonth * 12 }]
        : base.savings,
    investments:
      scenario.extraInvestment > 0
        ? [
            ...base.investments,
            {
              kind: "mutual_funds",
              current_value: 0,
              monthly_contribution: scenario.extraInvestment,
            },
          ]
        : base.investments,
    goals,
  };
}

function WhatIfPage() {
  const snapshotQuery = useQuery({ queryKey: ["snapshot"], queryFn: () => getFinancialSnapshot() });
  const [scenario, setScenario] = useState<Scenario>(zero);

  const base = useMemo(
    () => (snapshotQuery.data ? toPlannerInput(snapshotQuery.data) : null),
    [snapshotQuery.data],
  );
  const current = useMemo(() => (base ? analysePlan(base) : null), [base]);
  const projected = useMemo(
    () => (base ? analysePlan(applyScenario(base, scenario)) : null),
    [base, scenario],
  );

  if (snapshotQuery.isLoading) {
    return (
      <AppShell title="What if…">
        <LoadingState />
      </AppShell>
    );
  }
  if (snapshotQuery.isError || !current || !projected) {
    return (
      <AppShell title="What if…">
        <ErrorState
          description={toUserMessage(snapshotQuery.error)}
          onRetry={() => void snapshotQuery.refetch()}
        />
      </AppShell>
    );
  }

  const currency = current.currency;
  const touched = JSON.stringify(scenario) !== JSON.stringify(zero);
  const firstGoal = current.goals[0];

  const presets: { label: string; apply: Scenario }[] = [
    {
      label: `What if I invest ${formatMoney(2000, currency)} more?`,
      apply: { ...zero, extraInvestment: 2000 },
    },
    {
      label: `What if my expenses increase by ${formatMoney(5000, currency)}?`,
      apply: { ...zero, expenseChange: 5000 },
    },
    { label: "What if I delay my goal by 6 months?", apply: { ...zero, goalDelayMonths: 6 } },
    {
      label: `What if I save ${formatMoney(1000, currency)} more each month?`,
      apply: { ...zero, savingsPerMonth: 1000 },
    },
  ];

  return (
    <AppShell
      title="What if…"
      subtitle="Change one number and see what your plan would say instead."
    >
      <div className="space-y-6">
        <section className="panel p-5">
          <h2 className="font-display text-lg font-semibold">Quick scenarios</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => setScenario(preset.apply)}
              >
                {preset.label}
              </Button>
            ))}
            {touched ? (
              <Button variant="ghost" size="sm" onClick={() => setScenario(zero)}>
                Reset
              </Button>
            ) : null}
          </div>
        </section>

        <section className="panel space-y-6 p-5">
          <h2 className="font-display text-lg font-semibold">Adjust it yourself</h2>

          <SliderRow
            label="Extra invested each month"
            value={scenario.extraInvestment}
            max={Math.max(10000, Math.round(current.totalIncome / 2))}
            step={500}
            format={(value) => formatMoney(value, currency)}
            onChange={(extraInvestment) => setScenario({ ...scenario, extraInvestment })}
          />
          <SliderRow
            label="Change in monthly expenses"
            value={scenario.expenseChange}
            max={Math.max(10000, Math.round(current.totalExpenses / 2))}
            step={500}
            format={(value) => `+${formatMoney(value, currency)}`}
            onChange={(expenseChange) => setScenario({ ...scenario, expenseChange })}
          />
          <SliderRow
            label="Extra saved each month (shown after a year)"
            value={scenario.savingsPerMonth}
            max={Math.max(10000, Math.round(current.totalIncome / 2))}
            step={500}
            format={(value) => formatMoney(value, currency)}
            onChange={(savingsPerMonth) => setScenario({ ...scenario, savingsPerMonth })}
          />
          {firstGoal ? (
            <>
              <SliderRow
                label={`Change to "${firstGoal.name}" amount`}
                value={scenario.goalDelta}
                max={Math.max(50000, Math.round(firstGoal.targetAmount))}
                step={5000}
                format={(value) => `+${formatMoney(value, currency)}`}
                onChange={(goalDelta) => setScenario({ ...scenario, goalDelta })}
              />
              <SliderRow
                label={`Delay "${firstGoal.name}" by`}
                value={scenario.goalDelayMonths}
                max={36}
                step={3}
                format={(value) => `${value} months`}
                onChange={(goalDelayMonths) => setScenario({ ...scenario, goalDelayMonths })}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add a goal to test changes to goal amounts and dates.
            </p>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <PlanColumn
            heading="Your current plan"
            tone="current"
            currency={currency}
            surplus={current.monthlySurplus}
            coverage={current.emergencyFund.coverageMonths}
            investable={current.investableMonthly}
            goalMonthly={current.goalsMonthlyRequirement}
            action={current.primaryAction}
          />
          <PlanColumn
            heading={touched ? "Scenario plan" : "Scenario plan (no changes yet)"}
            tone="scenario"
            currency={currency}
            surplus={projected.monthlySurplus}
            coverage={projected.emergencyFund.coverageMonths}
            investable={projected.investableMonthly}
            goalMonthly={projected.goalsMonthlyRequirement}
            action={projected.primaryAction}
          />
        </div>

        <p className="text-sm text-muted-foreground">
          Scenarios change nothing that is saved. They are simple arithmetic on the numbers you
          entered and assume no investment growth or returns.
        </p>
      </div>
    </AppShell>
  );
}

function SliderRow({
  label,
  value,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const id = label.replace(/[^a-z]+/gi, "-").toLowerCase();
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        <span className="font-display text-sm font-semibold">{format(value)}</span>
      </div>
      <Slider
        id={id}
        value={[value]}
        max={max}
        step={step}
        onValueChange={(next) => onChange(next[0] ?? 0)}
        aria-label={label}
      />
    </div>
  );
}

function PlanColumn({
  heading,
  tone,
  currency,
  surplus,
  coverage,
  investable,
  goalMonthly,
  action,
}: {
  heading: string;
  tone: "current" | "scenario";
  currency: string;
  surplus: number;
  coverage: number;
  investable: number;
  goalMonthly: number;
  action: Parameters<typeof RecommendationCard>[0]["recommendation"];
}) {
  return (
    <section
      className={`panel space-y-4 p-5 ${tone === "scenario" ? "border-primary/40 bg-primary/5" : ""}`}
    >
      <h2 className="font-display text-lg font-semibold">{heading}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile
          label="Monthly surplus"
          value={formatMoney(surplus, currency)}
          tone={surplus >= 0 ? "positive" : "negative"}
        />
        <StatTile label="Emergency cover" value={formatMonths(coverage)} />
        <StatTile label="Can invest monthly" value={formatMoney(investable, currency)} />
        <StatTile label="Goals need monthly" value={formatMoney(goalMonthly, currency)} />
      </div>
      <RecommendationCard recommendation={action} currency={currency} />
    </section>
  );
}
