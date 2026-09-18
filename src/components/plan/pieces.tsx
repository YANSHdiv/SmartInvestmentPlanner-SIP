import { Progress } from "@/components/ui/progress";
import { formatMoney, formatMonths } from "@/lib/format";
import type { AllocationSlice, GoalAnalysis, PlannerAnalysis } from "@/lib/planner/types";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <div className="rounded-xl border border-border bg-background px-4 py-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p
        className={cn(
          "mt-1 font-display text-lg font-semibold",
          tone === "positive" && "text-success",
          tone === "negative" && "text-destructive",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function FinancialSummary({ analysis }: { analysis: PlannerAnalysis }) {
  const c = analysis.currency;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <StatTile label="Monthly income" value={formatMoney(analysis.totalIncome, c)} />
      <StatTile label="Monthly expenses" value={formatMoney(analysis.totalExpenses, c)} />
      <StatTile
        label="Monthly surplus"
        value={formatMoney(analysis.monthlySurplus, c)}
        tone={analysis.monthlySurplus >= 0 ? "positive" : "negative"}
        hint="Income minus expenses"
      />
      <StatTile label="Savings" value={formatMoney(analysis.totalSavings, c)} />
      <StatTile label="Investments" value={formatMoney(analysis.investments.totalValue, c)} />
      <StatTile
        label="Debt outstanding"
        value={formatMoney(analysis.debt.totalOutstanding, c)}
        hint={
          analysis.debt.totalOutstanding > 0
            ? `Highest rate about ${analysis.debt.highestInterestRate}% a year`
            : "No debt recorded"
        }
      />
    </div>
  );
}

export function EmergencyFundCard({ analysis }: { analysis: PlannerAnalysis }) {
  const { emergencyFund, currency } = analysis;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        An emergency fund is money kept accessible for unexpected expenses or income disruptions.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Set aside now" value={formatMoney(emergencyFund.current, currency)} />
        <StatTile
          label={`Target (${emergencyFund.targetMonths} months)`}
          value={formatMoney(emergencyFund.targetAmount, currency)}
          hint="You can change this target in My details"
        />
        <StatTile label="Covers about" value={formatMonths(emergencyFund.coverageMonths)} />
      </div>
      <div>
        <Progress
          value={Math.min(100, emergencyFund.progressPercent)}
          aria-label="Emergency fund progress"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          {Math.round(emergencyFund.progressPercent)}% of your target
          {emergencyFund.gap > 0
            ? ` · ${formatMoney(emergencyFund.gap, currency)} still to go`
            : " · target reached"}
        </p>
      </div>
    </div>
  );
}

export function GoalCard({
  goal,
  currency,
  actions,
}: {
  goal: GoalAnalysis;
  currency: string;
  actions?: React.ReactNode;
}) {
  return (
    <article className="panel space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display font-semibold">{goal.name}</h3>
          <p className="text-xs text-muted-foreground">
            {formatMoney(goal.currentAmount, currency)} of{" "}
            {formatMoney(goal.targetAmount, currency)}
            {goal.targetDate
              ? ` · by ${new Date(goal.targetDate).toLocaleDateString()}`
              : " · no date set"}
          </p>
        </div>
        {actions}
      </div>
      <Progress value={Math.min(100, goal.progressPercent)} aria-label={`${goal.name} progress`} />
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Progress</dt>
          <dd className="font-semibold">{Math.round(goal.progressPercent)}%</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Still needed</dt>
          <dd className="font-semibold">{formatMoney(goal.remainingAmount, currency)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Monthly estimate</dt>
          <dd className="font-semibold">
            {goal.monthlyContributionEstimate
              ? formatMoney(goal.monthlyContributionEstimate, currency)
              : "—"}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        Monthly figures are simple estimates: what is still needed divided by the months left. They
        assume no growth or returns.
      </p>
    </article>
  );
}

const complexityLabel = {
  lower: "Lower complexity",
  moderate: "Moderate complexity",
  higher: "Higher complexity",
};

export function AllocationCard({ slice, currency }: { slice: AllocationSlice; currency: string }) {
  return (
    <article className="panel space-y-2 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display font-semibold">{slice.label}</h3>
        <span className="font-display text-lg font-semibold text-primary">{slice.percent}%</span>
      </div>
      <p className="text-sm text-muted-foreground">
        About {formatMoney(slice.amount, currency)} a month of what you can invest
      </p>
      <p className="text-sm">
        <span className="font-semibold">Purpose: </span>
        {slice.purpose}
      </p>
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">Risk: </span>
        {slice.riskNote}
      </p>
      <p className="text-xs font-medium text-muted-foreground">
        {complexityLabel[slice.complexity]}
      </p>
    </article>
  );
}
