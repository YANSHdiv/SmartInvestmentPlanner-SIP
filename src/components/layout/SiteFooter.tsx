import { Link } from "@tanstack/react-router";

import { Disclaimer } from "@/components/Disclaimer";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface/50">
      <div className="mx-auto w-full max-w-6xl px-5 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-display text-sm font-semibold">Smart Investment Planner</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Understand your money, know your next step, and learn the basics as you go.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              Home
            </Link>
            <Link to="/learn" className="text-muted-foreground hover:text-foreground">
              Learn
            </Link>
            <Link to="/auth" className="text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
          </nav>
        </div>
        <Disclaimer className="mt-8" compact />
      </div>
    </footer>
  );
}
