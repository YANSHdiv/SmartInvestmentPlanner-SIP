import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { PublicHeader } from "@/components/layout/PublicHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Disclaimer } from "@/components/Disclaimer";
import { Badge } from "@/components/ui/badge";
import { EDUCATION_ARTICLES, getArticle } from "@/lib/content/education";

export const Route = createFileRoute("/learn/$slug")({
  loader: ({ params }) => {
    const article = getArticle(params.slug);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Article not found — Smart Investment Planner" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { article } = loaderData;
    const title = `${article.title} — Smart Investment Planner`;
    return {
      meta: [
        { title },
        { name: "description", content: article.summary },
        { property: "og:title", content: title },
        { property: "og:description", content: article.summary },
        { property: "og:type", content: "article" },
      ],
    };
  },
  errorComponent: () => (
    <ArticleShell>
      <h1 className="font-display text-2xl font-semibold">This article didn't load</h1>
      <p className="mt-2 text-muted-foreground">
        Please head back to the education centre and try again.
      </p>
      <Link to="/learn" className="mt-4 inline-block font-semibold text-primary hover:underline">
        Back to Learn
      </Link>
    </ArticleShell>
  ),
  notFoundComponent: () => (
    <ArticleShell>
      <h1 className="font-display text-2xl font-semibold">Article not found</h1>
      <p className="mt-2 text-muted-foreground">This guide doesn't exist or has been renamed.</p>
      <Link to="/learn" className="mt-4 inline-block font-semibold text-primary hover:underline">
        Browse all guides
      </Link>
    </ArticleShell>
  ),
  component: ArticlePage,
});

function ArticleShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">{children}</main>
      <SiteFooter />
    </div>
  );
}

function ArticlePage() {
  const { article } = Route.useLoaderData();
  const related = EDUCATION_ARTICLES.filter(
    (a) => a.section === article.section && a.slug !== article.slug,
  ).slice(0, 3);

  return (
    <ArticleShell>
      <Link to="/learn" className="text-sm font-semibold text-primary hover:underline">
        ← All guides
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{article.readMinutes} min read</Badge>
        <Badge variant="outline">
          {article.complexity === "lower"
            ? "Lower complexity"
            : article.complexity === "moderate"
              ? "Moderate complexity"
              : "Higher complexity"}
        </Badge>
      </div>
      <h1 className="mt-3 font-display text-3xl font-semibold">{article.title}</h1>
      <p className="mt-2 text-lg text-muted-foreground">{article.summary}</p>

      <article className="mt-8 space-y-7">
        <section>
          <h2 className="font-display text-lg font-semibold">What it is</h2>
          <p className="mt-2 text-muted-foreground">{article.whatItIs}</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold">A simple example</h2>
          <p className="mt-2 rounded-lg border border-border bg-surface/70 p-4 text-muted-foreground">
            {article.example}
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold">Why people use it</h2>
          <p className="mt-2 text-muted-foreground">{article.whyPeopleUse}</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold">Risks</h2>
          <ul className="mt-2 space-y-2 text-muted-foreground">
            {article.risks.map((risk) => (
              <li key={risk} className="flex gap-2">
                <span
                  aria-hidden
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive/70"
                />
                {risk}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold">Things to consider</h2>
          <ul className="mt-2 space-y-2 text-muted-foreground">
            {article.considerations.map((item) => (
              <li key={item} className="flex gap-2">
                <span
                  aria-hidden
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70"
                />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </article>

      {related.length ? (
        <section className="mt-12" aria-labelledby="related">
          <h2 id="related" className="font-display text-lg font-semibold">
            Read next
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {related.map((item) => (
              <li key={item.slug}>
                <Link
                  to="/learn/$slug"
                  params={{ slug: item.slug }}
                  className="panel block h-full p-4 text-sm transition-colors hover:border-primary/40"
                >
                  <span className="font-semibold">{item.title}</span>
                  <span className="mt-1 block text-muted-foreground">{item.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Disclaimer className="mt-10" />
    </ArticleShell>
  );
}
