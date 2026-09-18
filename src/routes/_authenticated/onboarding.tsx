import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { toUserMessage } from "@/lib/errors";

import { Logo } from "@/components/brand/Logo";
import { Disclaimer } from "@/components/Disclaimer";
import {
  AmountGrid,
  DebtEditor,
  EXPENSE_CATEGORIES,
  INCOME_KINDS,
  InvestmentEditor,
  SAVING_KINDS,
  TotalRow,
  sumMap,
  toExpenseRows,
  toIncomeRows,
  toSavingRows,
  type AmountMap,
  type DebtRow,
  type InvestmentRow,
} from "@/components/finance/LedgerEditors";
import { LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createGoal,
  getFinancialSnapshot,
  replaceLedger,
  savePlan,
  updateFinancialProfile,
  updateProfile,
} from "@/lib/api/finance.functions";
import { formatMoney, formatMonths, SUPPORTED_CURRENCIES } from "@/lib/format";
import { riskProfileFromScore } from "@/lib/planner/engine";
import type { InvestmentExperience } from "@/lib/planner/types";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Build your plan — Smart Investment Planner" },
      {
        name: "description",
        content:
          "An eight-step guide that turns your everyday numbers into a clear financial plan.",
      },
      { property: "og:title", content: "Build your plan — Smart Investment Planner" },
      {
        property: "og:description",
        content: "Answer a few simple questions and get your next financial action.",
      },
    ],
  }),
  component: OnboardingPage,
});

const TOTAL_STEPS = 8;

const AGE_RANGES = ["Under 20", "20–24", "25–29", "30–39", "40 or older"];
const OCCUPATIONS = [
  { key: "student", label: "Student" },
  { key: "intern", label: "Intern" },
  { key: "employed", label: "Employed" },
  { key: "self_employed", label: "Self-employed" },
  { key: "other", label: "Other" },
];
const STABILITY = [
  { key: "steady", label: "About the same every month" },
  { key: "varies", label: "It varies month to month" },
  { key: "irregular", label: "Irregular or occasional" },
];

const EXPERIENCE: { key: InvestmentExperience; label: string }[] = [
  { key: "none", label: "No, not yet" },
  { key: "a_little", label: "A little" },
  { key: "regular", label: "Yes, regularly" },
  { key: "unsure", label: "I'm not sure" },
];

const RISK_QUESTIONS = [
  {
    key: "reaction",
    question: "If an investment temporarily lost value, what would you most likely do?",
    options: [
      { label: "I would feel very uncomfortable and want to take my money out", score: 0 },
      { label: "I would probably wait and see what happens", score: 2 },
      { label: "I accept that values fluctuate temporarily and would keep going", score: 3 },
      {
        label:
          "I understand higher potential returns involve larger fluctuations, and I'm comfortable with that",
        score: 4,
      },
    ],
  },
  {
    key: "horizon",
    question: "When do you expect to need most of this money?",
    options: [
      { label: "Within a year", score: 0 },
      { label: "In one to three years", score: 2 },
      { label: "In three to seven years", score: 3 },
      { label: "Not for many years", score: 4 },
    ],
  },
  {
    key: "steadiness",
    question: "Which of these matters more to you right now?",
    options: [
      { label: "Keeping the amount steady, even if it grows slowly", score: 0 },
      { label: "Mostly steady, with a little growth", score: 2 },
      { label: "A balance of growth and steadiness", score: 3 },
      { label: "Growth over the long run, accepting ups and downs", score: 4 },
    ],
  },
] as const;

const GOAL_CATEGORIES = [
  { key: "emergency_fund", label: "Emergency fund" },
  { key: "laptop", label: "Laptop or device" },
  { key: "education", label: "Education" },
  { key: "travel", label: "Travel" },
  { key: "vehicle", label: "Vehicle" },
  { key: "house", label: "House" },
  { key: "retirement", label: "Retirement" },
  { key: "custom", label: "Something else" },
];

interface DraftGoal {
  name: string;
  category: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  priority: number;
}

function monthsUntil(date: string) {
  if (!date) return null;
  const target = new Date(date).getTime();
  const now = Date.now();
  if (Number.isNaN(target) || target <= now) return null;
  return Math.max(1, Math.round((target - now) / (1000 * 60 * 60 * 24 * 30.4375)));
}

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const snapshotQuery = useQuery({ queryKey: ["snapshot"], queryFn: () => getFinancialSnapshot() });

  const [step, setStep] = useState(1);
  const [currency, setCurrency] = useState("INR");
  const [ageRange, setAgeRange] = useState("");
  const [occupation, setOccupation] = useState("");
  const [stability, setStability] = useState("");
  const [incomes, setIncomes] = useState<AmountMap>({});
  const [expenses, setExpenses] = useState<AmountMap>({});
  const [savings, setSavings] = useState<AmountMap>({});
  const [hasDebt, setHasDebt] = useState<"no" | "yes">("no");
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [experience, setExperience] = useState<InvestmentExperience>("none");
  const [investments, setInvestments] = useState<InvestmentRow[]>([]);
  const [goals, setGoals] = useState<DraftGoal[]>([]);
  const [riskAnswers, setRiskAnswers] = useState<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);

  // Prefill the wizard with anything already saved so "save progress" resumes.
  useEffect(() => {
    const data = snapshotQuery.data;
    if (!data || hydrated) return;
    setHydrated(true);
    setCurrency(data.profile?.currency ?? "INR");
    setStep(Math.min(TOTAL_STEPS, Math.max(1, data.profile?.onboarding_step ?? 1)));
    setAgeRange(data.financialProfile?.age_range ?? "");
    setOccupation(data.financialProfile?.occupation ?? "");
    setStability(data.financialProfile?.income_stability ?? "");
    setExperience((data.financialProfile?.investment_experience as InvestmentExperience) ?? "none");
    setRiskAnswers((data.financialProfile?.risk_answers as Record<string, number>) ?? {});
    setHasDebt(data.debts.length > 0 ? "yes" : "no");
    setIncomes(
      Object.fromEntries(data.incomes.map((row) => [row.kind, Number(row.monthly_amount)])),
    );
    setExpenses(
      Object.fromEntries(data.expenses.map((row) => [row.category, Number(row.monthly_amount)])),
    );
    setSavings(Object.fromEntries(data.savings.map((row) => [row.kind, Number(row.amount)])));
    setDebts(
      data.debts.map((row) => ({
        kind: row.kind,
        outstanding_amount: Number(row.outstanding_amount),
        monthly_payment: Number(row.monthly_payment),
        interest_rate: Number(row.interest_rate),
      })),
    );
    setInvestments(
      data.investments.map((row) => ({
        kind: row.kind,
        current_value: Number(row.current_value),
        monthly_contribution: Number(row.monthly_contribution),
      })),
    );
    setGoals(
      data.goals.map((row) => ({
        name: row.name,
        category: row.category,
        target_amount: Number(row.target_amount),
        current_amount: Number(row.current_amount),
        target_date: row.target_date ?? "",
        priority: row.priority,
      })),
    );
  }, [snapshotQuery.data, hydrated]);

  const totalIncome = sumMap(incomes);
  const totalExpenses = sumMap(expenses);
  const surplus = totalIncome - totalExpenses;
  const accessible = (savings["bank"] ?? 0) + (savings["emergency"] ?? 0) + (savings["other"] ?? 0);
  const coverage = totalExpenses > 0 ? accessible / totalExpenses : null;

  const riskScore = useMemo(
    () => RISK_QUESTIONS.reduce((total, question) => total + (riskAnswers[question.key] ?? 0), 0),
    [riskAnswers],
  );
  const riskProfile = riskProfileFromScore(riskScore);
  const riskProfileLabel =
    riskProfile === "conservative"
      ? "Conservative"
      : riskProfile === "moderate"
        ? "Moderate"
        : "Higher risk tolerance";

  const persist = useMutation({
    mutationFn: async ({ nextStep, complete }: { nextStep: number; complete?: boolean }) => {
      await updateProfile({
        data: {
          currency,
          onboarding_step: nextStep,
          ...(complete ? { onboarding_completed: true } : {}),
        },
      });
      await updateFinancialProfile({
        data: {
          ...(ageRange ? { age_range: ageRange } : {}),
          ...(occupation ? { occupation } : {}),
          ...(stability ? { income_stability: stability } : {}),
          investment_experience: experience,
          risk_answers: riskAnswers,
          risk_score: riskScore,
          risk_profile: riskProfile,
          has_debt: hasDebt === "yes" && debts.length > 0,
        },
      });
      await replaceLedger({
        data: {
          incomes: toIncomeRows(incomes),
          expenses: toExpenseRows(expenses),
          savings: toSavingRows(savings),
          debts: hasDebt === "yes" ? debts.filter((row) => row.outstanding_amount > 0) : [],
          investments: investments.filter(
            (row) => row.current_value > 0 || row.monthly_contribution > 0,
          ),
        },
      });
      if (complete) {
        const existing = snapshotQuery.data?.goals ?? [];
        const existingNames = new Set(existing.map((row) => row.name));
        for (const goal of goals) {
          if (!goal.name.trim() || goal.target_amount <= 0 || existingNames.has(goal.name))
            continue;
          await createGoal({
            data: {
              name: goal.name,
              category: goal.category,
              target_amount: goal.target_amount,
              current_amount: goal.current_amount,
              target_date: goal.target_date || null,
              priority: goal.priority,
            },
          });
        }
        await savePlan();
      }
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries();
      if (variables.complete) {
        toast.success("Your plan is ready.");
        void navigate({ to: "/dashboard" });
      }
    },
    onError: (error) => toast.error(toUserMessage(error)),
  });

  if (snapshotQuery.isLoading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-12">
        <LoadingState label="Loading your details…" />
      </main>
    );
  }

  const canContinue =
    step === 1
      ? Boolean(ageRange && occupation && stability)
      : step === 8
        ? riskScore > 0 || Object.keys(riskAnswers).length === RISK_QUESTIONS.length
        : true;

  function goTo(next: number, complete = false) {
    persist.mutate({
      nextStep: Math.min(TOTAL_STEPS, Math.max(1, next)),
      ...(complete ? { complete } : {}),
    });
    if (!complete) setStep(next);
  }

  return (
    <main className="min-h-screen bg-surface/40 pb-16">
      <div className="mx-auto w-full max-w-2xl px-5 py-6">
        <Logo to="/dashboard" />

        <div className="mt-7">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">
            Let's build your financial plan.
          </h1>
          <p className="mt-1.5 text-muted-foreground">No financial knowledge required.</p>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">
              Step {step} of {TOTAL_STEPS}
            </span>
            <span className="text-muted-foreground">
              {Math.round((step / TOTAL_STEPS) * 100)}% complete
            </span>
          </div>
          <Progress
            className="mt-2"
            value={(step / TOTAL_STEPS) * 100}
            aria-label="Onboarding progress"
          />
        </div>

        <section className="panel mt-6 space-y-6 p-5 sm:p-6" aria-live="polite">
          {step === 1 ? (
            <>
              <StepHeader
                title="A little about you"
                why="Your age range, what you do, and how steady your income is change which priority comes first. We don't ask for anything more personal than this."
              />
              <div className="space-y-1.5">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((item) => (
                      <SelectItem key={item.code} value={item.code}>
                        {item.symbol} {item.code} — {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ChoiceGroup
                legend="Your age range"
                help="Time horizon matters more than anything else when thinking about investing."
                options={AGE_RANGES.map((range) => ({ key: range, label: range }))}
                value={ageRange}
                onChange={setAgeRange}
              />
              <ChoiceGroup
                legend="What best describes you?"
                help="Students and interns usually need accessible money before long-term investing."
                options={OCCUPATIONS}
                value={occupation}
                onChange={setOccupation}
              />
              <ChoiceGroup
                legend="How steady is your income?"
                help="Less predictable income usually means a larger accessible reserve."
                options={STABILITY}
                value={stability}
                onChange={setStability}
              />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <StepHeader
                title="What comes in each month"
                why="Your monthly income is the base for every calculation. Enter approximate figures — you can change them any time."
              />
              <AmountGrid
                items={INCOME_KINDS}
                value={incomes}
                onChange={setIncomes}
                currency={currency}
                idPrefix="income"
              />
              <TotalRow label="Total monthly income" amount={totalIncome} currency={currency} />
            </>
          ) : null}

          {step === 3 ? (
            <>
              <StepHeader
                title="What goes out each month"
                why="Your spending decides what is left over. What's left over is what a plan can actually work with."
              />
              <AmountGrid
                items={EXPENSE_CATEGORIES}
                value={expenses}
                onChange={setExpenses}
                currency={currency}
                idPrefix="expense"
              />
              <div className="space-y-3">
                <TotalRow
                  label="Total monthly expenses"
                  amount={totalExpenses}
                  currency={currency}
                />
                <TotalRow
                  label="Left over each month (income − expenses)"
                  amount={surplus}
                  currency={currency}
                  tone={surplus >= 0 ? "positive" : "negative"}
                />
              </div>
              {surplus < 0 ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
                  Your expenses currently exceed your income. Your plan will focus on improving
                  monthly cash flow before emphasizing investing.
                </p>
              ) : null}
            </>
          ) : null}

          {step === 4 ? (
            <>
              <StepHeader
                title="Money you can reach quickly"
                why="Accessible savings are what protect you when something unexpected happens. We use this to work out how many months you are covered for."
              />
              <AmountGrid
                items={SAVING_KINDS}
                value={savings}
                onChange={setSavings}
                currency={currency}
                idPrefix="saving"
              />
              <TotalRow label="Total accessible savings" amount={accessible} currency={currency} />
              <p className="text-sm text-muted-foreground">
                {coverage
                  ? `Your savings of ${formatMoney(accessible, currency)} divided by monthly expenses of ${formatMoney(
                      totalExpenses,
                      currency,
                    )} covers about ${formatMonths(coverage)} of spending.`
                  : "Add your monthly expenses in the previous step to see how many months your savings cover."}
              </p>
            </>
          ) : null}

          {step === 5 ? (
            <>
              <StepHeader
                title="Do you currently have debt?"
                why="Expensive debt usually costs more than investing is likely to earn, so it changes the order of your plan. You can skip this step."
              />
              <RadioGroup
                value={hasDebt}
                onValueChange={(value) => {
                  setHasDebt(value as "no" | "yes");
                  if (value === "yes" && debts.length === 0) {
                    setDebts([
                      {
                        kind: "education_loan",
                        outstanding_amount: 0,
                        monthly_payment: 0,
                        interest_rate: 0,
                      },
                    ]);
                  }
                }}
                className="space-y-2"
              >
                {[
                  { key: "no", label: "No debt" },
                  { key: "yes", label: "Yes, I have some debt" },
                ].map((option) => (
                  <Label
                    key={option.key}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-normal has-[button[data-state=checked]]:border-primary"
                  >
                    <RadioGroupItem value={option.key} />
                    {option.label}
                  </Label>
                ))}
              </RadioGroup>
              {hasDebt === "yes" ? (
                <DebtEditor rows={debts} onChange={setDebts} currency={currency} />
              ) : null}
            </>
          ) : null}

          {step === 6 ? (
            <>
              <StepHeader
                title="Have you invested before?"
                why="This tells us how much explaining to do, and whether your plan should start investing or review what you already hold."
              />
              <ChoiceGroup
                legend="Your experience so far"
                options={EXPERIENCE.map((item) => ({ key: item.key, label: item.label }))}
                value={experience}
                onChange={(value) => setExperience(value as InvestmentExperience)}
              />
              {experience !== "none" ? (
                <InvestmentEditor
                  rows={investments}
                  onChange={setInvestments}
                  currency={currency}
                />
              ) : null}
            </>
          ) : null}

          {step === 7 ? (
            <>
              <StepHeader
                title="What are you saving towards?"
                why="Goals with a date are funded differently to long-term investing. Add as many or as few as you like."
              />
              <div className="space-y-4">
                {goals.map((goal, index) => {
                  const months = monthsUntil(goal.target_date);
                  const remaining = Math.max(0, goal.target_amount - goal.current_amount);
                  const progress =
                    goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
                  return (
                    <fieldset
                      key={index}
                      className="space-y-4 rounded-xl border border-border bg-background p-4"
                    >
                      <legend className="sr-only">Goal {index + 1}</legend>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor={`goal-name-${index}`}>Goal name</Label>
                          <Input
                            id={`goal-name-${index}`}
                            value={goal.name}
                            placeholder="New laptop"
                            onChange={(event) =>
                              setGoals(
                                goals.map((g, i) =>
                                  i === index ? { ...g, name: event.target.value } : g,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`goal-cat-${index}`}>Type</Label>
                          <Select
                            value={goal.category}
                            onValueChange={(category) =>
                              setGoals(goals.map((g, i) => (i === index ? { ...g, category } : g)))
                            }
                          >
                            <SelectTrigger id={`goal-cat-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {GOAL_CATEGORIES.map((category) => (
                                <SelectItem key={category.key} value={category.key}>
                                  {category.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`goal-target-${index}`}>Amount needed</Label>
                          <Input
                            id={`goal-target-${index}`}
                            type="number"
                            min={1}
                            value={goal.target_amount || ""}
                            placeholder="0"
                            onChange={(event) =>
                              setGoals(
                                goals.map((g, i) =>
                                  i === index
                                    ? {
                                        ...g,
                                        target_amount: Math.max(0, Number(event.target.value) || 0),
                                      }
                                    : g,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`goal-current-${index}`}>Saved so far</Label>
                          <Input
                            id={`goal-current-${index}`}
                            type="number"
                            min={0}
                            value={goal.current_amount || ""}
                            placeholder="0"
                            onChange={(event) =>
                              setGoals(
                                goals.map((g, i) =>
                                  i === index
                                    ? {
                                        ...g,
                                        current_amount: Math.max(
                                          0,
                                          Number(event.target.value) || 0,
                                        ),
                                      }
                                    : g,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`goal-date-${index}`}>Target date</Label>
                          <Input
                            id={`goal-date-${index}`}
                            type="date"
                            value={goal.target_date}
                            onChange={(event) =>
                              setGoals(
                                goals.map((g, i) =>
                                  i === index ? { ...g, target_date: event.target.value } : g,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`goal-priority-${index}`}>How important is it?</Label>
                          <Select
                            value={String(goal.priority)}
                            onValueChange={(value) =>
                              setGoals(
                                goals.map((g, i) =>
                                  i === index ? { ...g, priority: Number(value) } : g,
                                ),
                              )
                            }
                          >
                            <SelectTrigger id={`goal-priority-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Most important</SelectItem>
                              <SelectItem value="2">Important</SelectItem>
                              <SelectItem value="3">Nice to have</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {Math.round(progress)}% there · {formatMoney(remaining, currency)} still
                        needed
                        {months
                          ? ` · roughly ${formatMoney(Math.ceil(remaining / months), currency)} a month (an estimate, assuming no growth)`
                          : ""}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setGoals(goals.filter((_, i) => i !== index))}
                      >
                        Remove this goal
                      </Button>
                    </fieldset>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setGoals([
                      ...goals,
                      {
                        name: "",
                        category: "custom",
                        target_amount: 0,
                        current_amount: 0,
                        target_date: "",
                        priority: 2,
                      },
                    ])
                  }
                >
                  Add a goal
                </Button>
              </div>
            </>
          ) : null}

          {step === 8 ? (
            <>
              <StepHeader
                title="How do you feel about ups and downs?"
                why="This shapes the mix your plan suggests once your basics are covered. There are no right answers."
              />
              {RISK_QUESTIONS.map((question) => (
                <ChoiceGroup
                  key={question.key}
                  legend={question.question}
                  options={question.options.map((option) => ({
                    key: String(option.score),
                    label: option.label,
                  }))}
                  value={
                    riskAnswers[question.key] !== undefined ? String(riskAnswers[question.key]) : ""
                  }
                  onChange={(value) =>
                    setRiskAnswers({ ...riskAnswers, [question.key]: Number(value) })
                  }
                />
              ))}
              <div className="rounded-xl border border-border bg-surface/70 px-4 py-3">
                <p className="text-sm font-semibold">Your profile: {riskProfileLabel}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This is an educational profile based on your answers, not a professional
                  suitability assessment.
                </p>
              </div>
            </>
          ) : null}
        </section>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
          >
            Back
          </Button>
          {step < TOTAL_STEPS ? (
            <Button onClick={() => goTo(step + 1)} disabled={!canContinue || persist.isPending}>
              Continue
            </Button>
          ) : (
            <Button onClick={() => goTo(TOTAL_STEPS, true)} disabled={persist.isPending}>
              {persist.isPending ? "Building your plan…" : "See my plan"}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              persist.mutate(
                { nextStep: step },
                { onSuccess: () => toast.success("Progress saved. You can come back any time.") },
              );
            }}
            disabled={persist.isPending}
          >
            Save progress
          </Button>
        </div>

        <Disclaimer className="mt-8" compact />
      </div>
    </main>
  );
}

function StepHeader({ title, why }: { title: string; why: string }) {
  return (
    <header>
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{why}</p>
    </header>
  );
}

function ChoiceGroup({
  legend,
  help,
  options,
  value,
  onChange,
}: {
  legend: string;
  help?: string;
  options: { key: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">{legend}</legend>
      {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
      <RadioGroup value={value} onValueChange={onChange} className="space-y-2 pt-1">
        {options.map((option) => (
          <Label
            key={option.key}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-normal has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-primary/5"
          >
            <RadioGroupItem value={option.key} className="mt-0.5" />
            <span>{option.label}</span>
          </Label>
        ))}
      </RadioGroup>
    </fieldset>
  );
}
