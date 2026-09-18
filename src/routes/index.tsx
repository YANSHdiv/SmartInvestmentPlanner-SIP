import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Compass, LineChart, ListChecks, Target } from "lucide-react";

import heroImage from "@/assets/hero-plan.jpg";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Investment Planner — Know what to do with your money next" },
      {
        name: "description",
        content:
          "Understand your financial priorities, set goals, learn investing basics and create a simple financial plan — even if you're starting from zero.",
      },
      {
        property: "og:title",
        content: "Smart Investment Planner — Know what to do with your money next",
      },
      {
        property: "og:description",
        content:
          "A beginner-friendly planner that tells you what to prioritise next, and explains why.",
      },
    ],
  }),
  component: LandingPage,
});

const STEPS = [
  {
    title: "Understand",
    body: "Your income, spending and savings in one clear picture — no spreadsheets.",
  },
  {
    title: "Prioritise",
    body: "One next action chosen from your own numbers, not generic advice.",
  },
  {
    title: "Plan",
    body: "Goals with realistic monthly amounts and a suggested mix when you're ready.",
  },
  { title: "Learn", body: "Short plain-language guides that match the step you're on." },
  { title: "Track", body: "Save plans over time and see how your situation changes." },
];

const BEGINNER_POINTS = [
  "No jargon, and no performance statistics you'd have to look up.",
  "Complexity is described as lower, moderate or higher — not as ratios.",
  "Every recommendation shows what to do, why, how, and what comes after.",
  "Nothing is sold, recommended by brand, or presented as guaranteed.",
];

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="eyebrow">For students and first-time investors</p>
            <h1 className="mt-3 font-display text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl">
              Know what to do with your money next.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Understand your financial priorities, set goals, learn investing basics, and create a
              simple financial plan — even if you're starting from zero.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Build My Plan
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/learn">Learn the Basics</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Educational planning only — never individualised financial advice.
            </p>
          </div>
          <img
            src={heroImage}
            alt="Illustration of rising steps with a coin stack and a checklist, representing steady financial progress"
            width={1280}
            height={1024}
            className="w-full rounded-2xl border border-border"
          />
        </section>

        <section className="border-y border-border bg-surface/50" aria-labelledby="how-it-works">
          <div className="mx-auto w-full max-w-6xl px-5 py-14">
            <h2 id="how-it-works" className="font-display text-2xl font-semibold sm:text-3xl">
              How it works
            </h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map((step, index) => (
                <li key={step.title} className="panel p-5">
                  <span className="font-display text-sm font-semibold text-primary">
                    0{index + 1}
                  </span>
                  <h3 className="mt-2 font-display font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-14" aria-labelledby="beginners">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Compass className="h-5 w-5" aria-hidden />
              </span>
              <h2 id="beginners" className="mt-4 font-display text-2xl font-semibold sm:text-3xl">
                Built for beginners
              </h2>
              <p className="mt-3 text-muted-foreground">
                Most tools assume you already know where you want to invest. This one starts a step
                earlier: what should you do with your money next, and why that comes before anything
                else.
              </p>
              <ul className="mt-6 space-y-3">
                {BEGINNER_POINTS.map((point) => (
                  <li key={point} className="flex gap-3 text-sm text-muted-foreground">
                    <span
                      aria-hidden
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <Feature
                icon={<ListChecks className="h-5 w-5" aria-hidden />}
                title="Your next financial action"
                body="One primary action at a time — improving cash flow, building accessible savings, dealing with expensive debt, funding a near-term goal, or starting to invest — with the reasoning drawn from your own figures."
              />
              <Feature
                icon={<Target className="h-5 w-5" aria-hidden />}
                title="Goal planning"
                body="Add what you're saving towards, see progress, what's left, and a clearly labelled estimate of the monthly amount each goal needs."
              />
              <Feature
                icon={<LineChart className="h-5 w-5" aria-hidden />}
                title="A plan you can question"
                body="Change one number in the what-if view and see how your plan would differ, side by side with your current one."
              />
              <Feature
                icon={<BookOpen className="h-5 w-5" aria-hidden />}
                title="Learn investing"
                body="Guides on saving versus investing, inflation, compounding, risk, diversification, mutual funds, index funds, fixed deposits and more."
              />
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-surface/50">
          <div className="mx-auto w-full max-w-3xl px-5 py-14 text-center">
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">
              Start with what you actually know
            </h2>
            <p className="mt-3 text-muted-foreground">
              Approximate numbers are fine. Eight short steps, about five minutes, and you can save
              your progress at any point.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Build My Plan
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/learn">Learn the Basics</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <article className="panel p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <h3 className="font-display font-semibold">{title}</h3>
      </div>
      <p className="mt-2.5 text-sm text-muted-foreground">{body}</p>
    </article>
  );
}
