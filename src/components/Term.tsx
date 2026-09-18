import { Link } from "@tanstack/react-router";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { lookupTerm } from "@/lib/content/glossary";

/**
 * Inline financial-terminology helper: shows a plain-language definition and,
 * where one exists, a link to the matching learn article.
 */
export function Term({ k, children }: { k: string; children?: React.ReactNode }) {
  const entry = lookupTerm(k);
  const label = children ?? entry?.term ?? k;

  if (!entry) return <>{label}</>;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="cursor-help rounded-sm underline decoration-dotted decoration-from-font underline-offset-4 hover:text-primary"
          aria-label={`What does ${entry.term} mean?`}
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-sm" align="start">
        <p className="font-display font-semibold">{entry.term}</p>
        <p className="mt-1.5 text-muted-foreground">{entry.definition}</p>
        {entry.article ? (
          <Link
            to="/learn/$slug"
            params={{ slug: entry.article }}
            className="mt-3 inline-block text-xs font-semibold text-primary hover:underline"
          >
            Learn more →
          </Link>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
