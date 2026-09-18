import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { Disclaimer } from "@/components/Disclaimer";
import { ProjectionSimulator } from "@/components/invest/ProjectionSimulator";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { toUserMessage } from "@/lib/errors";
import { Term } from "@/components/Term";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { getOpportunityReport } from "@/lib/api/opportunity.functions";
import { OPPORTUNITY_DISCLAIMER } from "@/lib/planner/assetConfig";
import type { AssetClassResult, OpportunityReport, Suitability } from "@/lib/planner/assetTypes";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/invest")({
  head: () => ({
    meta: [
      { title: "Where should I invest? — Smart Investment Planner" },
      {
        name: "description",
        content:
          "See how much you can reasonably invest, which asset categories may fit your situation, and the reasoning behind each one.",
      },
      { property: "og:title", content: "Where should I invest? — Smart Investment Planner" },
      {
        property: "og:description",
        content:
          "Your risk band, investable capacity and a plain-language explanation of every asset category.",
      },
    ],
  }),
  component: InvestPage,
});

const GROUP_ORDER: Record<Suitability, number> = {
  strong_fit: 0,
  potential_fit: 1,
  limited_fit: 2,
  not_suitable: 3,
};

const SUITABILITY_STYLES: Record<Suitability, string> = {
  strong_fit: "bg-primary/10 text-primary",
  potential_fit: "bg-secondary text-secondary-foreground",
  limited_fit: "bg-muted text-muted-foreground",
  not_suitable: "bg-muted text-muted-foreground",
};

const RISK_WORDS = {
  low: "Moves little in value",
  moderate: "Moves moderately",
  high: "Moves a lot",
} as const;
const LIQUIDITY_WORDS = {
  high: "Reachable within days",
  moderate: "Reachable, but not instantly",
  low: "Hard to reach quickly",
} as const;

function InvestPage() {
  const [beginnerMode, setBeginnerMode] = useState(true);
  const reportQuery = useQuery({
    queryKey: ["opportunity"],
    queryFn: () => getOpportunityReport(),
  });

  if (reportQuery.isLoading) {
    return (
      <AppShell title="Where should I invest?">
        <LoadingState />
      </AppShell>
    );
  }
  if (reportQuery.isError || !reportQuery.data) {
    return (
      <AppShell title="Where should I invest?">
        <ErrorState
          description={toUserMessage(reportQuery.error)}
          onRetry={() => void reportQuery.refetch()}
        />
      </AppShell>
    );
  }

  const report = reportQuery.data;
  const { currency } = report;
  const money = (value: number) => formatMoney(value, currency);

  if (report.capacity.availableCapital === 0 && report.capacity.monthlySurplus === 0) {
    return (
      <AppShell title="Where should I invest?">
        <EmptyState
          title="Your details are needed first"
          description="This page works from your income, expenses, savings, debt and goals. Add them and it will fill in."
          action={
            <Button asChild>
              <Link to="/onboarding">Add my details</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const suitable = report.assetClasses.filter(
    (a) => a.suitability === "strong_fit" || a.suitability === "potential_fit",
  );
  const needsMore = report.assetClasses.filter((a) => a.suitability === "limited_fit");
  const notNow = report.assetClasses.filter((a) => a.suitability === "not_suitable");

  return (
    <AppShell
      title="Where should I invest?"
      subtitle="What can reasonably be invested, which categories may fit you, and why."
    >
      <div className="space-y-6">
        {/* Beginner mode ---------------------------------------------------- */}
        <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-medium">Beginner mode {beginnerMode ? "on" : "off"}</p>
            <p className="text-sm text-muted-foreground">
              {beginnerMode
                ? "Every term is explained, risk is described before opportunity, and nothing assumes prior knowledge."
                : "Shorter explanations, with the added beginner notes hidden."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="beginner-mode" className="text-sm">
              Explain everything
            </label>
            <Switch id="beginner-mode" checked={beginnerMode} onCheckedChange={setBeginnerMode} />
          </div>
        </div>

        {/* Headline figures ------------------------------------------------ */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="panel p-4">
            <p className="eyebrow">Your current risk profile</p>
            <p className="mt-1 font-display text-xl font-semibold">{report.risk.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Calculated from {report.risk.factors.length} parts of your situation.
            </p>
          </div>
          <div className="panel p-4">
            <p className="eyebrow">Investable today</p>
            <p className="mt-1 font-display text-xl font-semibold">
              {money(report.capacity.oneTime)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              After the money that should stay reachable.
            </p>
          </div>
          <div className="panel p-4">
            <p className="eyebrow">Investable each month</p>
            <p className="mt-1 font-display text-xl font-semibold">
              {money(report.capacity.monthly)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              From a surplus of {money(report.capacity.monthlySurplus)}, after{" "}
              {money(report.capacity.committedMonthly)} already committed.
            </p>
          </div>
          <div className="panel p-4">
            <p className="eyebrow">Should stay reachable</p>
            <p className="mt-1 font-display text-xl font-semibold">
              {money(report.capacity.liquidReserve)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Emergency reserve {money(report.capacity.emergencyReserveComponent)} plus near-term
              goals {money(report.capacity.shortTermGoalComponent)}.
            </p>
          </div>
        </section>

        {/* Before investing ------------------------------------------------ */}
        <section
          className={`panel p-5 ${report.beforeInvesting.blocking ? "border-primary/40 bg-primary/5" : ""}`}
        >
          <h2 className="font-display text-lg font-semibold">{report.beforeInvesting.heading}</h2>
          <ol className="mt-3 space-y-2">
            {report.beforeInvesting.steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-muted-foreground">{report.beforeInvesting.explanation}</p>
        </section>

        {/* Risk explanation ------------------------------------------------ */}
        <section className="panel p-5">
          <h2 className="font-display text-lg font-semibold">
            Why your profile is {report.risk.label.toLowerCase()}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{report.risk.explanation}</p>
          {report.risk.cappedByPriorities ? (
            <p className="mt-3 rounded-md bg-secondary p-3 text-sm">
              Your answers alone would place you higher, but your reserve, debt or monthly cash flow
              is not yet in a position to support it. Comfort with risk never moves ahead of these
              basics.
            </p>
          ) : null}
          <ul className="mt-4 space-y-2 text-sm">
            {report.risk.factors.map((factor) => (
              <li key={factor.key} className="rounded-md border border-border/60 p-3">
                <p className="font-medium">{factor.label}</p>
                <p className="mt-1 text-muted-foreground">{factor.explanation}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">{report.risk.reviewNote}</p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link to="/onboarding" search={{ step: 8 }}>
              Answer the risk questions again
            </Link>
          </Button>
        </section>

        {/* Capacity notes -------------------------------------------------- */}
        <section className="panel p-5">
          <h2 className="font-display text-lg font-semibold">
            How your investment capacity was worked out
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This is not the same as asking how much money you have. Your bank balance is never
            treated as fully investable.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {report.capacity.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>

        {report.lowCapitalMode.active ? (
          <section className="panel p-5">
            <p className="eyebrow">Starting out</p>
            <h2 className="mt-1 font-display text-lg font-semibold">
              {report.lowCapitalMode.heading}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {report.lowCapitalMode.explanation}
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {report.lowCapitalMode.focus.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Asset classes --------------------------------------------------- */}
        <AssetGroup
          title="Potentially suitable for you now"
          description="Judged against your risk band, time frames, capital and existing holdings."
          items={suitable}
          currency={currency}
          beginnerMode={beginnerMode}
          emptyNote="Nothing falls into this group yet. The steps above come first."
        />
        <AssetGroup
          title="Needs more capital or a different time frame"
          description="Not unsuitable in principle — just not a fit for your situation as it stands today."
          items={needsMore}
          currency={currency}
          beginnerMode={beginnerMode}
        />
        <AssetGroup
          title="Currently lower priority"
          description="These would not be sensible for you right now, and the reason is given for each."
          items={notNow}
          currency={currency}
          beginnerMode={beginnerMode}
        />

        {/* Allocation framework -------------------------------------------- */}
        {report.framework.length ? (
          <section className="panel p-5">
            <h2 className="font-display text-lg font-semibold">
              An illustrative mix for your situation
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Generated from your own numbers, so it differs from anyone else's. The percentages are
              illustrative planning ranges, not guaranteed or universally correct allocations.
            </p>
            <ul className="mt-4 space-y-3">
              {report.framework.map((row) => (
                <li key={row.key}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{row.label}</span>
                    <span className="text-muted-foreground">
                      about {row.percent}% (range {row.rangePercent[0]}–{row.rangePercent[1]}%) ·{" "}
                      {money(row.oneTimeAmount)} lump sum · {money(row.monthlyAmount)}/month
                    </span>
                  </div>
                  <Progress value={row.percent} className="mt-2 h-2" />
                  <p className="mt-1 text-xs text-muted-foreground">{row.role}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Equity ---------------------------------------------------------- */}
        <section className="panel p-5">
          <h2 className="font-display text-lg font-semibold">Company shares and equity funds</h2>
          <p className="mt-2 text-sm text-muted-foreground">{report.equity.reason}</p>
          <ol className="mt-4 space-y-3">
            {report.equity.ladder.map((rung) => (
              <li key={rung.key} className="rounded-md border border-border/60 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{rung.label}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                    {rung.emphasis === "start_here"
                      ? "Usually first"
                      : rung.emphasis === "next"
                        ? "Later"
                        : "For experienced investors"}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">{rung.description}</p>
              </li>
            ))}
          </ol>

          <div className="mt-5">
            <h3 className="font-medium">Company research list</h3>
            <p className="mt-1 text-sm text-muted-foreground">{report.equity.researchNote}</p>
            {report.equity.researchList.length ? (
              <ul className="mt-3 space-y-3">
                {report.equity.researchList.map((item) => (
                  <li key={item.id} className="rounded-md border border-border/60 p-3 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.sector} · {item.marketCapBand} company · valuation{" "}
                        {item.valuationBand} · price movement {item.volatilityBand}
                      </span>
                    </div>
                    <p className="mt-2 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                      Why it appears here
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                      {item.matchReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                    <p className="mt-2 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                      Things to be careful about
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                      {item.cautions.map((caution) => (
                        <li key={caution}>{caution}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-3 rounded-md bg-secondary p-3 text-xs">{report.market.note}</p>
          </div>
        </section>

        <ProjectionSimulator
          currency={currency}
          defaultMonthly={report.capacity.monthly}
          defaultInitial={report.capacity.oneTime}
        />

        {/* Gap analysis ---------------------------------------------------- */}
        <section className="panel p-5">
          <h2 className="font-display text-lg font-semibold">
            How your current holdings compare with your plan
          </h2>
          {report.gaps.length ? (
            <ul className="mt-3 space-y-3">
              {report.gaps.map((gap) => (
                <li key={gap.key} className="rounded-md border border-border/60 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{gap.title}</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {gap.severity === "high"
                        ? "Worth acting on"
                        : gap.severity === "medium"
                          ? "Worth planning for"
                          : "Minor"}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{gap.explanation}</p>
                  <p className="mt-1">{gap.suggestion}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Nothing stands out as mismatched between what you hold and what your plan implies.
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Nothing here is a suggestion to sell something immediately. Where a change is worth
            making, directing new money differently is usually enough.
          </p>
        </section>

        {/* Assumptions and disclaimer -------------------------------------- */}
        <section className="panel p-5">
          <h2 className="font-display text-base font-semibold">What this analysis assumes</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {report.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
          {beginnerMode ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Terms worth knowing before acting: <Term k="liquidity" />,{" "}
              <Term k="diversification" />, <Term k="asset allocation" /> and{" "}
              <Term k="volatility" />. Costs and taxes also reduce what you keep, so check them for
              anything you buy.
            </p>
          ) : null}
        </section>

        <Disclaimer />
        <p className="text-xs text-muted-foreground">{OPPORTUNITY_DISCLAIMER}</p>
      </div>
    </AppShell>
  );
}

function AssetGroup({
  title,
  description,
  items,
  currency,
  beginnerMode,
  emptyNote,
}: {
  title: string;
  description: string;
  items: AssetClassResult[];
  currency: string;
  beginnerMode: boolean;
  emptyNote?: string;
}) {
  if (items.length === 0 && !emptyNote) return null;
  return (
    <section aria-labelledby={`group-${title.replace(/\s+/g, "-").toLowerCase()}`}>
      <h2
        id={`group-${title.replace(/\s+/g, "-").toLowerCase()}`}
        className="font-display text-lg font-semibold"
      >
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyNote}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items
            .slice()
            .sort((a, b) => GROUP_ORDER[a.suitability] - GROUP_ORDER[b.suitability])
            .map((item) => (
              <AssetCard
                key={item.key}
                asset={item}
                currency={currency}
                beginnerMode={beginnerMode}
              />
            ))}
        </div>
      )}
    </section>
  );
}

function AssetCard({
  asset,
  currency,
  beginnerMode,
}: {
  asset: AssetClassResult;
  currency: string;
  beginnerMode: boolean;
}) {
  return (
    <article className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold">{asset.label}</h3>
          <p className="text-sm text-muted-foreground">{asset.role}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${SUITABILITY_STYLES[asset.suitability]}`}
        >
          {asset.suitabilityLabel}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="eyebrow">Risk</dt>
          <dd>{RISK_WORDS[asset.riskLevel]}</dd>
        </div>
        <div>
          <dt className="eyebrow">Time</dt>
          <dd>{asset.horizonLabel}</dd>
        </div>
        <div>
          <dt className="eyebrow">Liquidity</dt>
          <dd>{LIQUIDITY_WORDS[asset.liquidity]}</dd>
        </div>
      </dl>

      <div className="mt-4 space-y-2 text-sm">
        <p>
          <span className="font-medium">Why this: </span>
          {asset.explanation.why}
        </p>
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">What to watch: </span>
          {asset.explanation.risk}
        </p>
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">How much: </span>
          {asset.explanation.howMuch}
        </p>
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">What next: </span>
          {asset.explanation.whatNext}
        </p>
        {beginnerMode ? (
          <p className="rounded-md bg-secondary p-3">
            <span className="font-medium">In plain terms: </span>
            {asset.beginnerNote} {asset.explanation.time} {asset.explanation.liquidity}{" "}
            {asset.minimumCapitalNote}
          </p>
        ) : null}
      </div>

      {asset.suggestedSharePercent !== null ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Illustrative share of your investable money: about {asset.suggestedSharePercent}% —{" "}
          {formatMoney(asset.suggestedOneTimeAmount ?? 0, currency)} lump sum and{" "}
          {formatMoney(asset.suggestedMonthlyAmount ?? 0, currency)} a month. Not a target you must
          reach.
        </p>
      ) : null}
    </article>
  );
}

export type { OpportunityReport };
