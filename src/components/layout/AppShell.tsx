import { Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Compass,
  FlaskConical,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  PieChart,
  Settings,
  Target,
} from "lucide-react";
import { useState } from "react";

import { Logo } from "@/components/brand/Logo";
import { Disclaimer } from "@/components/Disclaimer";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/plan", label: "Investment plan", icon: PieChart },
  { to: "/invest", label: "Where to invest", icon: Compass },
  { to: "/what-if", label: "What if", icon: FlaskConical },
  { to: "/history", label: "Plan history", icon: History },
  { to: "/learn", label: "Learn", icon: BookOpen },
  { to: "/settings", label: "My details", icon: Settings },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Sections" className="space-y-1">
      {NAV.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
          activeProps={{ className: "bg-surface text-foreground" }}
          activeOptions={{ exact: false }}
        >
          <Icon className="h-4 w-4" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    void navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen bg-surface/40">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-background px-4 py-5 lg:flex">
        <Logo to="/dashboard" />
        <div className="mt-7 flex-1">
          <NavList />
        </div>
        <Button variant="ghost" size="sm" className="justify-start gap-2.5" onClick={signOut}>
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 px-5 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="h-4 w-4" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 px-4 py-5">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <Logo to="/dashboard" />
                <div className="mt-6">
                  <NavList onNavigate={() => setOpen(false)} />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 justify-start gap-2.5"
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Sign out
                </Button>
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-semibold sm:text-xl">{title}</h1>
              {subtitle ? (
                <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
            {actions}
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-6">{children}</main>

        <footer className="mx-auto w-full max-w-5xl px-5 pb-8">
          <Disclaimer compact />
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Compass className="h-3.5 w-3.5" aria-hidden />
            Every recommendation is generated from the details you entered.
          </p>
        </footer>
      </div>
    </div>
  );
}
