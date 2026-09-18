import { createFileRoute, Link } from "@tanstack/react-router";

import { PublicHeader } from "@/components/layout/PublicHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { EDUCATION_ARTICLES, EDUCATION_SECTIONS, startHereArticles } from "@/lib/content/education";

export const Route = createFileRoute("/learn/")({
  head: () => ({
    meta: [
      { title: "Learn investing basics — Smart Investment Planner" },
      {
        name: "description",
        content:
          "Plain-language guides for beginners: saving vs investing, emergency funds, risk, diversification, mutual funds, index funds, SIPs and more.",
      },
      { property: "og:title", content: "Learn investing basics — Smart Investment Planner" },
      {
        property: "og:description",
        content: "Short, jargon-free explanations of the ideas every first-time investor needs.",
      },
    ],
  }),
  component: LearnIndex,
});

const complexityLabel = {
  lower: "Lower complexity",
  moderate: "Moderate complexity",
  higher: "Higher complexity",
} as const;

function LearnIndex() {
  const startHere = startHereArticles();

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
        <p className="eyebrow">Education centre</p>
        <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
          Learn how investing works
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Every article follows the same shape: what it is, a simple example, why people use it, the
          risks, and things to consider. No jargon assumed and nothing to buy.
        </p>

        <section className="mt-10" aria-labelledby="start-here">
          <h2 id="start-here" className="font-display text-xl font-semibold">
            Start here
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ten short reads that cover the foundations, in a sensible order.
          </p>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {startHere.map((article, index) => (
              <li key={article.slug}>
                <Link
                  to="/learn/$slug"
                  params={{ slug: article.slug }}
                  className="panel flex h-full flex-col gap-2 p-4 transition-colors hover:border-primary/40"
                >
                  <span className="text-xs font-semibold text-primary">Step {index + 1}</span>
                  <span className="font-display font-semibold">{article.title}</span>
                  <span className="text-sm text-muted-foreground">{article.summary}</span>
                  <span className="mt-auto pt-2 text-xs text-muted-foreground">
                    {complexityLabel[article.complexity]} · {article.readMinutes} min
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {EDUCATION_SECTIONS.map((section) => (
          <section key={section.key} className="mt-12" aria-labelledby={`section-${section.key}`}>
            <h2 id={`section-${section.key}`} className="font-display text-xl font-semibold">
              {section.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {EDUCATION_ARTICLES.filter((article) => article.section === section.key).map(
                (article) => (
                  <li key={article.slug}>
                    <Link
                      to="/learn/$slug"
                      params={{ slug: article.slug }}
                      className="panel flex h-full flex-col gap-2 p-4 transition-colors hover:border-primary/40"
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-display font-semibold">{article.title}</span>
                        <Badge variant="secondary" className="shrink-0 text-[0.65rem]">
                          {complexityLabel[article.complexity]}
                        </Badge>
                      </span>
                      <span className="text-sm text-muted-foreground">{article.summary}</span>
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </section>
        ))}
      </main>
      <SiteFooter />
    </div>
  );
}
