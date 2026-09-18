import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import {
  AllocationCard,
  EmergencyFundCard,
  FinancialSummary,
  StatTile,
} from "@/components/plan/pieces";
import { JourneyTracker, RecommendationCard } from "@/components/plan/RecommendationCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { toUserMessage } from "@/lib/errors";
import { Term } from "@/components/Term";
import { Button } from "@/components/ui/button";
import { analyseCurrentPlan } from "@/lib/api/finance.functions";
import { startHereArticles } from "@/lib/content/education";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({
    meta: [
      { title: "Your investment plan — Smart Investment Planner" },
      {
        name: "description",
        content: "Your priority order, suggested mix and the reasoning behind every part of it.",
      },
      { property: "og:title", content: "Your investment plan — Smart Investment Planner" },
      {
        property: "og:description",
        content: "See the full priority sequence and a suggested mix explained in plain language.",
      },
    ],
  }),
  component: PlanPage,
});

function PlanPage() {
  const planQuery = useQuery({ queryKey: ["analysis"], queryFn: () => analyseCurrentPlan() });

  if (planQuery.isLoading) {
    return (
      <AppShell title="Your plan">
        <LoadingState />
      </AppShell>
    );
  }
  if (planQuery.isError || !planQuery.data) {
    return (
      <AppShell title="Your plan">
        <ErrorState
          description={toUserMessage(planQuery.error)}
          onRetry={() => void planQuery.refetch()}
        />
      </AppShell>
    );
  }

  const { analysis } = planQuery.data;
  const currency = analysis.currency;
  const allocationTotal = analysis.allocation.reduce((total, slice) => total + slice.percent, 0);

  return (
    <AppShell title="Your plan" subtitle="Your priorities in order, and what each one is for.">
      <div className="space-y-6">
        <section>
          <p className="eyebrow mb-2">Your next action</p>
          <RecommendationCard recommendation={analysis.primaryAction} currency={currency} primary />
        </section>

        <section className="panel p-5">
          <h2 className="font-display text-lg font-semibold">Your snapshot</h2>
          <div className="mt-4">
            <FinancialSummary analysis={analysis} />
          </div>
        </section>

        <section aria-labelledby="priority-order">
          <h2 id="priority-order" className="font-display text-lg font-semibold">
            The full priority order
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Everyone's list is different because it comes from your own numbers. Work down it in
            order.
          </p>
          <div className="mt-4 space-y-3">
            {analysis.priorities.map((recommendation, index) => (
              <RecommendationCard
                key={recommendation.code}
                recommendation={recommendation}
                currency={currency}
                index={index}
              />
            ))}
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="font-display text-lg font-semibold">Emergency fund</h2>
          <div className="mt-4">
            <EmergencyFundCard analysis={analysis} />
          </div>
        </section>

        <section aria-labelledby="mix">
          <h2 id="mix" className="font-display text-lg font-semibold">
            A suggested mix
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This is a simple <Term k="asset allocation">asset allocation</Term> based on your{" "}
            <Term k="risk profile">risk profile</Term>. It is educational and never a guarantee of
            returns.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StatTile
              label="Available to invest monthly"
              value={formatMoney(analysis.investableMonthly, currency)}
              hint="After your higher priorities"
            />
            <StatTile
              label="Your risk profile"
              value={
                analysis.riskProfile === "conservative"
                  ? "Conservative"
                  : analysis.riskProfile === "moderate"
                    ? "Moderate"
                    : "Higher risk tolerance"
              }
              hint="Educational, not a suitability assessment"
            />
            <StatTile label="Allocation adds up to" value={`${allocationTotal}%`} />
          </div>

          {analysis.investableMonthly > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {analysis.allocation.map((slice) => (
                <AllocationCard key={slice.key} slice={slice} currency={currency} />
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="Nothing to allocate yet"
                description="Your earlier priorities come first. When money is free to invest each month, a suggested mix appears here with the reasoning."
              />
            </div>
          )}
        </section>

        {analysis.beginnerMode ? (
          <section className="panel p-5">
            <h2 className="font-display text-lg font-semibold">Start here</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Beginner mode is on, so complexity is described in plain words rather than performance
              statistics.
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {startHereArticles().map((article) => (
                <li key={article.slug}>
                  <Link
                    to="/learn/$slug"
                    params={{ slug: article.slug }}
                    className="block rounded-xl border border-border bg-background p-4 text-sm transition-colors hover:border-primary/40"
                  >
                    <span className="font-semibold">{article.title}</span>
                    <span className="mt-1 block text-muted-foreground">{article.summary}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="panel p-5">
          <h2 className="font-display text-lg font-semibold">Your journey</h2>
          <div className="mt-4">
            <JourneyTracker stages={analysis.journey} />
          </div>
          <Button asChild variant="outline" size="sm" className="mt-5">
            <Link to="/what-if">Try a what-if scenario</Link>
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
