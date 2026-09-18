import { Link } from "@tanstack/react-router";

export function Logo({ to = "/" }: { to?: "/" | "/dashboard" }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-2.5"
      aria-label="Smart Investment Planner home"
    >
      <span
        aria-hidden
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4.5 w-4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <path d="M4 18V9M10 18V5M16 18v-6M22 18H2" strokeLinecap="round" />
        </svg>
      </span>
      <span className="font-display text-[0.95rem] leading-tight font-semibold tracking-tight">
        Smart Investment
        <span className="block text-[0.7rem] font-medium tracking-[0.18em] text-muted-foreground uppercase">
          Planner
        </span>
      </span>
    </Link>
  );
}
