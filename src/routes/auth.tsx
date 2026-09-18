import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/brand/Logo";
import { Disclaimer } from "@/components/Disclaimer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Smart Investment Planner" },
      {
        name: "description",
        content:
          "Create an account or sign in to build your explainable financial plan and see what to do with your money next.",
      },
      { property: "og:title", content: "Sign in — Smart Investment Planner" },
      {
        property: "og:description",
        content: "Create your account to build a beginner-friendly financial plan step by step.",
      },
    ],
  }),
  component: AuthPage,
});

function safeNext(next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function AuthPage() {
  const { mode, next } = Route.useSearch();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) {
        void navigate({ to: safeNext(next) === "/onboarding" ? "/onboarding" : "/dashboard" });
      }
    });
    return () => {
      active = false;
    };
  }, [navigate, next]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Account created. Let's build your plan.");
          void navigate({ to: "/onboarding" });
        } else {
          toast.success("Check your email to confirm your account, then sign in.");
          setIsSignUp(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        void navigate({ to: "/dashboard" });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-surface/40">
      <div className="mx-auto flex w-full max-w-6xl px-5 py-5">
        <Logo />
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-16">
        <div className="panel px-6 py-7">
          <h1 className="font-display text-2xl font-semibold">
            {isSignUp ? "Let's build your financial plan" : "Welcome back"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isSignUp
              ? "No financial knowledge required. It takes about five minutes."
              : "Sign in to see what matters most right now."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isSignUp ? (
              <div className="space-y-1.5">
                <Label htmlFor="name">Your first name</Label>
                <Input
                  id="name"
                  autoComplete="given-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Riya"
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="mt-5 text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => setIsSignUp((value) => !value)}
            >
              {isSignUp ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Just browsing?{" "}
          <Link to="/learn" className="font-semibold text-primary hover:underline">
            Learn the basics first
          </Link>
        </p>

        <Disclaimer className="mt-6" compact />
      </div>
    </main>
  );
}
