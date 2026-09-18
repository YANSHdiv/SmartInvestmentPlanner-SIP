import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { toUserMessage } from "@/lib/errors";

import { AppShell } from "@/components/layout/AppShell";
import {
  AllocationCard,
  EmergencyFundCard,
  FinancialSummary,
  GoalCard,
} from "@/components/plan/pieces";
import { PlanExplanation } from "@/components/plan/PlanExplanation";
import { JourneyTracker, RecommendationCard } from "@/components/plan/RecommendationCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { analyseCurrentPlan, savePlan } from "@/lib/api/finance.functions";
import { recommendedArticles } from "@/lib/content/education";
import { greeting } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — Smart Investment Planner" },
      {
        name: "description",
        content:
          "See your next financial action, your snapshot, emergency fund, goals and journey.",
      },
      { property: "og:title", content: "Your dashboard — Smart Investment Planner" },
      {
        property: "og:description",
        content: "One clear next action, explained with your own numbers.",
      },
    ],
  }),
  component: DashboardPage,
});

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DashboardPage() {
  const queryClient = useQueryClient();
  const planQuery = useQuery({ queryKey: ["analysis"], queryFn: () => analyseCurrentPlan() });

  const save = useMutation({
    mutationFn: () => savePlan(),
    onSuccess: () => {
      toast.success("Plan saved to your history.");
      void queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: () => toast.error("We couldn't save this plan just now."),
  });

  if (planQuery.isLoading) {
    return (
      <AppShell title="Your dashboard">
        <LoadingState label="Working out what matters most…" />
      </AppShell>
    );
  }

  if (planQuery.isError || !planQuery.data) {
    return (
      <AppShell title="Your dashboard">
        <ErrorState
          description={toUserMessage(planQuery.error)}
          onRetry={() => void planQuery.refetch()}
        />
      </AppShell>
    );
  }

  const { analysis, onboardingCompleted, displayName } = planQuery.data;
  const name = displayName ?? "there";
  const currency = analysis.currency;

  if (!onboardingCompleted && analysis.totalIncome === 0) {
    return (
      <AppShell title={`${greeting()}, ${name}`} subtitle="Let's get your plan started.">
        <EmptyState
          title="Your plan needs a few details first"
          description="Answer eight short steps about your income, spending, savings and goals. It takes about five minutes and you can save your progress."
          action={
            <Button asChild>
              <Link to="/onboarding">Build my plan</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const articles = recommendedArticles(analysis.primaryAction.code);
  const activeGoals = analysis.goals.filter((goal) => !goal.isFunded).slice(0, 2);

  return (
    <AppShell
      title={`${greeting()}, ${name}`}
      subtitle="Here's what matters most right now."
      actions={
        <Button variant="outline" size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save this plan"}
        </Button>
      }
    >
      <div className="space-y-5">
        <section aria-labelledby="next-action">
          <h2 id="next-action" className="sr-only">
            What should I do next?
          </h2>
          <p className="eyebrow mb-2">What should I do next?</p>
          <RecommendationCard recommendation={analysis.primaryAction} currency={currency} primary />
        </section>

        <PlanExplanation analysis={analysis} />

        {analysis.warnings.length ? (
          <ul className="space-y-2">
            {analysis.warnings.map((warning) => (
              <li
                key={warning}
                className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm"
              >
                {warning}
              </li>
            ))}
          </ul>
        ) : null}

        <Section
          title="Financial snapshot"
          description="The numbers your plan is based on."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/settings">Update details</Link>
            </Button>
          }
        >
          <FinancialSummary analysis={analysis} />
        </Section>

        <Section title="Emergency fund" description="Your safety net before anything else.">
          <EmergencyFundCard analysis={analysis} />
        </Section>

        <Section
          title="Your goals"
          description="Progress towards what you're saving for."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/goals">Manage goals</Link>
            </Button>
          }
        >
          {analysis.goals.length === 0 ? (
            <EmptyState
              title="No goals yet"
              description="Adding even one goal — a laptop, a course, a trip — makes your plan far more specific."
              action={
                <Button asChild size="sm">
                  <Link to="/goals">Add a goal</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {(activeGoals.length ? activeGoals : analysis.goals.slice(0, 2)).map((goal) => (
                <GoalCard key={goal.id ?? goal.name} goal={goal} currency={currency} />
              ))}
            </div>
          )}
        </Section>

        <Section
          title="Investments"
          description={
            analysis.investableMonthly > 0
              ? "A suggested mix for the money you can invest each month, once your basics are covered."
              : "Your plan focuses on earlier priorities before investing."
          }
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/plan">See full plan</Link>
            </Button>
          }
        >
          {analysis.allocation.length && analysis.investableMonthly > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {analysis.allocation.slice(0, 2).map((slice) => (
                <AllocationCard key={slice.key} slice={slice} currency={currency} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Investing comes a little later"
              description="Your next action above needs to happen first. Once it's done, your plan will suggest a mix here."
              action={
                <Button asChild size="sm" variant="outline">
                  <Link to="/learn">Learn the basics meanwhile</Link>
                </Button>
              }
            />
          )}
        </Section>

        <Section
          title="Where should I invest?"
          description="How much you can reasonably invest, and which asset categories may fit your situation."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/invest">Open</Link>
            </Button>
          }
        >
          <p className="text-sm text-muted-foreground">
            Your risk band, investable capacity and every asset category judged against your own
            numbers — with the reasoning shown for each one.
          </p>
        </Section>

        <Section
          title="Your financial journey"
          description="Where you are in the sequence most people follow."
        >
          <JourneyTracker stages={analysis.journey} />
        </Section>

        <Section
          title="Recommended learning"
          description="Short reads that match the action you're working on."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/learn">All guides</Link>
            </Button>
          }
        >
          <ul className="grid gap-3 sm:grid-cols-3">
            {articles.map((article) => (
              <li key={article.slug}>
                <Link
                  to="/learn/$slug"
                  params={{ slug: article.slug }}
                  className="block h-full rounded-xl border border-border bg-background p-4 text-sm transition-colors hover:border-primary/40"
                >
                  <span className="font-semibold">{article.title}</span>
                  <span className="mt-1 block text-muted-foreground">{article.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          title="How your assumptions are set"
          description="Nothing here is hidden — these are the rules behind your plan."
        >
          <ul className="space-y-2 text-sm text-muted-foreground">
            {analysis.assumptions.map((assumption) => (
              <li key={assumption} className="flex gap-2">
                <span
                  aria-hidden
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60"
                />
                {assumption}
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </AppShell>
  );
}
