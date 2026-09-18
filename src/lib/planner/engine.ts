/**
 * The explainable financial decision engine.
 *
 * Pure functions only: given a snapshot of a person's finances it returns an
 * analysis, an ordered list of priorities, one primary action and an
 * illustrative allocation. No network, storage or randomness is used here, so
 * the same input always produces the same plan.
 */

import { ALLOCATION_TEMPLATES, ASSET_CLASS_META, PLANNER_RULES } from "./config";
import type {
  AllocationSlice,
  GoalAnalysis,
  JourneyStage,
  PlannerAnalysis,
  PlannerInput,
  Recommendation,
} from "./types";

const round = (value: number, dp = 0) => {
  const factor = 10 ** dp;
  return Math.round(value * factor) / factor;
};

const safe = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export function monthsBetween(from: Date, to: Date): number {
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth()) +
    (to.getDate() >= from.getDate() ? 0 : -1);
  return months;
}

export function analyseGoals(input: PlannerInput): GoalAnalysis[] {
  const today = input.today ?? new Date();

  return input.goals
    .filter((goal) => (goal.status ?? "active") !== "deleted")
    .map((goal) => {
      const targetAmount = Math.max(safe(goal.target_amount), 0);
      const currentAmount = Math.min(
        safe(goal.current_amount),
        Math.max(targetAmount, safe(goal.current_amount)),
      );
      const remainingAmount = Math.max(targetAmount - currentAmount, 0);
      const progressPercent = targetAmount > 0 ? round((currentAmount / targetAmount) * 100, 1) : 0;

      let monthsRemaining: number | null = null;
      if (goal.target_date) {
        const target = new Date(goal.target_date);
        if (!Number.isNaN(target.getTime())) {
          monthsRemaining = Math.max(monthsBetween(today, target), 0);
        }
      }

      const monthlyContributionEstimate =
        monthsRemaining === null
          ? null
          : monthsRemaining <= 0
            ? remainingAmount
            : round(remainingAmount / monthsRemaining);

      let horizon: GoalAnalysis["horizon"] = "unknown";
      if (monthsRemaining !== null) {
        horizon =
          monthsRemaining <= PLANNER_RULES.shortTermGoalMonths
            ? "short"
            : monthsRemaining <= PLANNER_RULES.longTermGoalMonths
              ? "medium"
              : "long";
      }

      return {
        id: goal.id ?? null,
        name: goal.name,
        category: goal.category ?? "custom",
        targetAmount,
        currentAmount,
        remainingAmount,
        progressPercent,
        targetDate: goal.target_date ?? null,
        monthsRemaining,
        monthlyContributionEstimate,
        horizon,
        priority: goal.priority ?? 2,
        isFunded: remainingAmount === 0 && targetAmount > 0,
      };
    })
    .sort(
      (a, b) =>
        a.priority - b.priority || (a.monthsRemaining ?? 9999) - (b.monthsRemaining ?? 9999),
    );
}

function buildAllocation(
  investable: number,
  riskProfile: PlannerAnalysis["riskProfile"],
): AllocationSlice[] {
  const template = ALLOCATION_TEMPLATES[riskProfile] ?? ALLOCATION_TEMPLATES.moderate;

  return template.map((slice) => {
    const meta = ASSET_CLASS_META[slice.key] ?? ASSET_CLASS_META["other"]!;
    return {
      key: slice.key,
      label: meta.label,
      percent: slice.percent,
      amount: round((investable * slice.percent) / 100),
      purpose: meta.purpose,
      riskNote: meta.riskNote,
      complexity: meta.complexity,
    };
  });
}

/** Runs the full analysis. See PLANNER_RULES for every assumption used. */
export function analysePlan(input: PlannerInput): PlannerAnalysis {
  const warnings: string[] = [];

  /** Formats an amount for use inside recommendation wording. */
  const money = (value: number) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: input.currency,
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return `${Math.round(value)}`;
    }
  };

  const totalIncome = round(sum(input.incomes.map((i) => safe(i.monthly_amount))), 2);
  const totalExpenses = round(sum(input.expenses.map((e) => safe(e.monthly_amount))), 2);
  const essentialExpenses = round(
    sum(input.expenses.filter((e) => e.is_essential).map((e) => safe(e.monthly_amount))),
    2,
  );
  const monthlySurplus = round(totalIncome - totalExpenses, 2);
  const surplusRate = totalIncome > 0 ? round(monthlySurplus / totalIncome, 4) : 0;

  const totalSavings = round(sum(input.savings.map((s) => safe(s.amount))), 2);
  const accessibleSavings = round(
    sum(input.savings.filter((s) => s.kind !== "locked").map((s) => safe(s.amount))),
    2,
  );

  const essentialBase = essentialExpenses > 0 ? essentialExpenses : totalExpenses;
  const targetMonths = safe(input.emergencyMonthsTarget) || PLANNER_RULES.defaultEmergencyMonths;
  const emergencyTargetAmount = round(essentialBase * targetMonths, 2);
  const coverageMonths = essentialBase > 0 ? round(accessibleSavings / essentialBase, 1) : 0;
  const emergencyProgress =
    emergencyTargetAmount > 0
      ? Math.min(round((accessibleSavings / emergencyTargetAmount) * 100, 1), 100)
      : 0;

  const totalOutstanding = round(sum(input.debts.map((d) => safe(d.outstanding_amount))), 2);
  const totalMonthlyPayment = round(sum(input.debts.map((d) => safe(d.monthly_payment))), 2);
  const highestInterestRate = input.debts.length
    ? Math.max(...input.debts.map((d) => safe(d.interest_rate)))
    : 0;
  const hasExpensiveDebt = highestInterestRate >= PLANNER_RULES.expensiveDebtRate;
  const debtToIncomeRatio = totalIncome > 0 ? round(totalMonthlyPayment / totalIncome, 4) : 0;

  const investmentValue = round(sum(input.investments.map((i) => safe(i.current_value))), 2);
  const investmentContribution = round(
    sum(input.investments.map((i) => safe(i.monthly_contribution))),
    2,
  );
  const investmentKinds = Array.from(
    new Set(input.investments.filter((i) => safe(i.current_value) > 0).map((i) => i.kind)),
  );

  const goals = analyseGoals(input);
  const goalsMonthlyRequirement = round(
    sum(goals.filter((g) => !g.isFunded).map((g) => g.monthlyContributionEstimate ?? 0)),
    2,
  );

  if (totalIncome === 0)
    warnings.push(
      "No income has been recorded yet, so surplus and allocation estimates are limited.",
    );
  if (totalExpenses === 0)
    warnings.push(
      "No expenses have been recorded yet, so emergency-fund coverage may be overstated.",
    );

  const cashFlowHealthy = monthlySurplus > 0;
  const beginnerMode =
    input.investmentExperience === "none" || input.investmentExperience === "unsure";
  const priorityBudget =
    monthlySurplus > 0 ? round(monthlySurplus * PLANNER_RULES.priorityShareOfSurplus) : 0;

  const priorities: Recommendation[] = [];

  if (monthlySurplus <= 0) {
    priorities.push({
      code: "A",
      title: "Improve your monthly cash flow first",
      why: `Your recorded income is ${money(totalIncome)} and recorded expenses are ${money(totalExpenses)} per month, which leaves a surplus of ${money(monthlySurplus)}. Investing more each month is not realistic until money is left over.`,
      how: "Look at your largest non-essential categories and reduce or pause one of them, or explore ways to add income. Re-run your plan once your surplus turns positive.",
      afterThis:
        "Once you have a positive surplus, the plan moves on to building accessible emergency savings.",
      suggestedMonthlyAmount: null,
      urgency: "critical",
    });
  }

  if (coverageMonths < targetMonths) {
    priorities.push({
      code: "B",
      title: "Build your emergency savings",
      why: `Your accessible savings of ${money(accessibleSavings)} cover approximately ${coverageMonths} month(s) of your ${money(essentialBase)} essential monthly expenses. Your plan uses a ${targetMonths}-month reserve assumption.`,
      how: cashFlowHealthy
        ? `Consider directing part of your monthly surplus — around ${money(priorityBudget)} — toward a separate, easy-to-access reserve account.`
        : "Once your monthly surplus is positive, direct part of it into a separate, easy-to-access reserve account.",
      afterThis: hasExpensiveDebt
        ? "After that, the plan focuses on your highest-cost debt."
        : "Once your chosen reserve target is reached, your plan can be reviewed again and shift toward goals and long-term investing.",
      suggestedMonthlyAmount: cashFlowHealthy ? priorityBudget : null,
      urgency: coverageMonths < PLANNER_RULES.minimumEmergencyMonths ? "critical" : "high",
    });
  }

  if (hasExpensiveDebt) {
    priorities.push({
      code: "C",
      title: "Address your highest-cost debt",
      why: `You recorded debt with an approximate interest rate of ${highestInterestRate}%, which is at or above the ${PLANNER_RULES.expensiveDebtRate}% level this plan treats as expensive. Interest paid at that level often exceeds what cautious investing is likely to add.`,
      how: "Consider paying more than the minimum on the highest-rate balance while keeping other payments current.",
      afterThis:
        "Once high-cost balances are reduced, more of your surplus can move toward goals and long-term investing.",
      suggestedMonthlyAmount: cashFlowHealthy ? priorityBudget : null,
      urgency: "high",
    });
  }

  const shortTermGoals = goals.filter((g) => !g.isFunded && g.horizon === "short");
  if (shortTermGoals.length > 0) {
    const first = shortTermGoals[0]!;
    priorities.push({
      code: "D",
      title: `Fund your short-term goal: ${first.name}`,
      why: `"${first.name}" still needs ${money(first.remainingAmount)}${
        first.monthsRemaining !== null ? ` within about ${first.monthsRemaining} month(s)` : ""
      }. Money needed soon is usually kept in stable, accessible places rather than investments that fluctuate.`,
      how:
        first.monthlyContributionEstimate !== null
          ? `Setting aside roughly ${money(first.monthlyContributionEstimate)} per month would reach this target by your date. This is an estimate, not a guarantee.`
          : "Add a target date to this goal so a monthly estimate can be calculated.",
      afterThis:
        "After short-term goals are on track, the plan shifts toward starting or increasing long-term investing.",
      suggestedMonthlyAmount: first.monthlyContributionEstimate,
      urgency: "medium",
    });
  }

  if (cashFlowHealthy) {
    priorities.push({
      code: "E",
      title:
        investmentContribution > 0
          ? "Increase your long-term investing"
          : "Begin long-term investing",
      why: `You have a monthly surplus of ${money(monthlySurplus)} and currently invest ${money(investmentContribution)} per month. Money you will not need for several years can be invested for the long term, accepting that values fluctuate.`,
      how: beginnerMode
        ? "Start small and simple: a regular monthly amount into a diversified fund is a common beginner starting point. Read the Start Here guides before committing money."
        : "Consider raising your regular monthly contribution and keeping it consistent through market ups and downs.",
      afterThis:
        "Once contributions are running, the plan moves to reviewing how your money is spread across investment types.",
      suggestedMonthlyAmount: priorityBudget,
      urgency: "medium",
    });
  }

  const isDiversified = investmentKinds.length >= PLANNER_RULES.diversifiedKindCount;
  if (investmentValue > 0) {
    priorities.push({
      code: "F",
      title: "Review how your investments are spread",
      why: `You hold approximately ${money(investmentValue)} across ${investmentKinds.length} investment type(s).${
        isDiversified ? "" : " Relying on a small number of types concentrates risk in one place."
      }`,
      how: "Compare your current mix with the illustrative allocation for your educational risk profile and adjust gradually rather than all at once.",
      afterThis: "Revisit your plan whenever your income, expenses or goals change noticeably.",
      suggestedMonthlyAmount: null,
      urgency: "low",
    });
  }

  if (priorities.length === 0) {
    priorities.push({
      code: "F",
      title: "Review and keep your plan current",
      why: "Based on what you have recorded, your reserves cover your target and no high-cost debt or urgent short-term goal is outstanding.",
      how: "Keep contributions steady, and update your income, expenses and goals when something changes.",
      afterThis: "Reviewing every few months keeps the plan aligned with your situation.",
      suggestedMonthlyAmount: null,
      urgency: "low",
    });
  }

  const primaryAction = priorities[0]!;

  const investableMonthly = round(
    Math.max(
      monthlySurplus -
        (primaryAction.code === "E" ? 0 : (primaryAction.suggestedMonthlyAmount ?? 0)),
      0,
    ),
    2,
  );

  const allocation = buildAllocation(
    primaryAction.code === "E" || primaryAction.code === "F"
      ? Math.max(investableMonthly, 0)
      : investableMonthly,
    input.riskProfile,
  );

  const journey: JourneyStage[] = [
    {
      key: "understand",
      label: "Understand your finances",
      state: totalIncome > 0 ? "done" : "current",
    },
    {
      key: "surplus",
      label: "Calculate monthly surplus",
      state: monthlySurplus > 0 ? "done" : totalIncome > 0 ? "current" : "upcoming",
    },
    {
      key: "reserve",
      label: "Build emergency savings",
      state:
        coverageMonths >= targetMonths
          ? "done"
          : primaryAction.code === "B"
            ? "current"
            : "upcoming",
    },
    {
      key: "goals",
      label: "Work toward goals",
      state:
        goals.length > 0 && goals.every((g) => g.isFunded)
          ? "done"
          : primaryAction.code === "D"
            ? "current"
            : "upcoming",
    },
    {
      key: "invest",
      label: "Start or expand long-term investing",
      state:
        investmentContribution > 0 ? "done" : primaryAction.code === "E" ? "current" : "upcoming",
    },
    {
      key: "review",
      label: "Review your plan",
      state: primaryAction.code === "F" ? "current" : "upcoming",
    },
  ];

  const assumptions = [
    `Emergency-fund target: ${targetMonths} months of essential expenses (${money(emergencyTargetAmount)}).`,
    `Debt is treated as expensive at or above ${PLANNER_RULES.expensiveDebtRate}% annual interest.`,
    `Goals due within ${PLANNER_RULES.shortTermGoalMonths} months are treated as short-term.`,
    `Around ${Math.round(PLANNER_RULES.priorityShareOfSurplus * 100)}% of your surplus is suggested for your current priority.`,
    "Goal contribution figures are simple division of the remaining amount by months left, with no assumed investment growth.",
  ];

  return {
    currency: input.currency,
    totalIncome,
    totalExpenses,
    essentialExpenses,
    monthlySurplus,
    surplusRate,
    totalSavings,
    accessibleSavings,
    emergencyFund: {
      current: accessibleSavings,
      targetMonths,
      targetAmount: emergencyTargetAmount,
      coverageMonths,
      progressPercent: emergencyProgress,
      gap: round(Math.max(emergencyTargetAmount - accessibleSavings, 0), 2),
    },
    debt: {
      totalOutstanding,
      totalMonthlyPayment,
      highestInterestRate,
      hasExpensiveDebt,
      expensiveDebtThreshold: PLANNER_RULES.expensiveDebtRate,
      debtToIncomeRatio,
    },
    investments: {
      totalValue: investmentValue,
      totalMonthlyContribution: investmentContribution,
      kinds: investmentKinds,
      isDiversified,
    },
    goals,
    goalsMonthlyRequirement,
    riskProfile: input.riskProfile,
    investmentExperience: input.investmentExperience,
    beginnerMode,
    cashFlowHealthy,
    priorities,
    primaryAction,
    allocation,
    investableMonthly,
    journey,
    assumptions,
    warnings,
  };
}

/** Maps the risk questionnaire score (0-12) to an educational profile. */
export function riskProfileFromScore(score: number): PlannerAnalysis["riskProfile"] {
  if (score <= 4) return "conservative";
  if (score <= 8) return "moderate";
  return "higher_risk";
}
