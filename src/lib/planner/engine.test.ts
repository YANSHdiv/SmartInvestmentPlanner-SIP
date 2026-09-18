import { describe, expect, it } from "vitest";

import { analysePlan, analyseGoals, riskProfileFromScore } from "./engine";
import { PLANNER_RULES } from "./config";
import type { PlannerInput } from "./types";

const TODAY = new Date("2026-01-15T00:00:00Z");

function input(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
    currency: "INR",
    riskProfile: "moderate",
    investmentExperience: "none",
    emergencyMonthsTarget: 6,
    incomes: [{ kind: "salary", monthly_amount: 50000 }],
    expenses: [
      { category: "rent", monthly_amount: 20000, is_essential: true },
      { category: "food", monthly_amount: 8000, is_essential: true },
      { category: "shopping", monthly_amount: 4000, is_essential: false },
    ],
    savings: [{ kind: "bank", amount: 60000 }],
    debts: [],
    investments: [],
    goals: [],
    today: TODAY,
    ...overrides,
  };
}

describe("totals and cash flow", () => {
  it("adds income, expenses and surplus", () => {
    const result = analysePlan(input());
    expect(result.totalIncome).toBe(50000);
    expect(result.totalExpenses).toBe(32000);
    expect(result.monthlySurplus).toBe(18000);
    expect(result.essentialExpenses).toBe(28000);
    expect(result.cashFlowHealthy).toBe(true);
  });

  it("puts cash flow first when expenses exceed income", () => {
    const result = analysePlan(
      input({ expenses: [{ category: "rent", monthly_amount: 60000, is_essential: true }] }),
    );
    expect(result.monthlySurplus).toBeLessThan(0);
    expect(result.primaryAction.code).toBe("A");
    expect(result.cashFlowHealthy).toBe(false);
    expect(result.primaryAction.suggestedMonthlyAmount).toBeNull();
  });

  it("does not suggest increasing investing when income equals expenses", () => {
    const result = analysePlan(
      input({ expenses: [{ category: "rent", monthly_amount: 50000, is_essential: true }] }),
    );
    expect(result.primaryAction.code).toBe("A");
    expect(result.investableMonthly).toBe(0);
  });
});

describe("emergency fund", () => {
  it("reports coverage in months against the configured target", () => {
    const result = analysePlan(input({ savings: [{ kind: "bank", amount: 30000 }] }));
    // 30000 / 20000 essential base per month
    expect(result.emergencyFund.coverageMonths).toBeCloseTo(30000 / 28000, 1);
    expect(result.emergencyFund.targetMonths).toBe(6);
    expect(result.primaryAction.code).toBe("B");
  });

  it("treats zero savings as the most urgent reserve case", () => {
    const result = analysePlan(input({ savings: [] }));
    expect(result.emergencyFund.current).toBe(0);
    expect(result.primaryAction.code).toBe("B");
    expect(result.primaryAction.urgency).toBe("critical");
  });

  it("moves past the reserve once the target is met", () => {
    const result = analysePlan(input({ savings: [{ kind: "bank", amount: 28000 * 6 }] }));
    expect(result.emergencyFund.progressPercent).toBe(100);
    expect(result.primaryAction.code).not.toBe("B");
  });

  it("honours a custom reserve target", () => {
    const result = analysePlan(
      input({ emergencyMonthsTarget: 3, savings: [{ kind: "bank", amount: 28000 * 3 }] }),
    );
    expect(result.emergencyFund.targetMonths).toBe(3);
    expect(result.primaryAction.code).not.toBe("B");
  });
});

describe("debt", () => {
  it("raises expensive debt ahead of investing", () => {
    const result = analysePlan(
      input({
        savings: [{ kind: "bank", amount: 28000 * 6 }],
        debts: [
          {
            kind: "credit_card",
            outstanding_amount: 40000,
            monthly_payment: 4000,
            interest_rate: 36,
          },
        ],
      }),
    );
    expect(result.debt.hasExpensiveDebt).toBe(true);
    expect(result.primaryAction.code).toBe("C");
  });

  it("does not raise a debt priority for low-cost debt", () => {
    const result = analysePlan(
      input({
        savings: [{ kind: "bank", amount: 28000 * 6 }],
        debts: [
          {
            kind: "education_loan",
            outstanding_amount: 200000,
            monthly_payment: 3000,
            interest_rate: 8,
          },
        ],
      }),
    );
    expect(result.debt.hasExpensiveDebt).toBe(false);
    expect(result.priorities.some((item) => item.code === "C")).toBe(false);
  });

  it("records no debt when none is entered", () => {
    const result = analysePlan(input());
    expect(result.debt.totalOutstanding).toBe(0);
    expect(result.debt.hasExpensiveDebt).toBe(false);
  });
});

describe("goals", () => {
  it("computes progress, remaining amount and a monthly estimate", () => {
    const [goal] = analyseGoals(
      input({
        goals: [
          {
            name: "Laptop",
            target_amount: 60000,
            current_amount: 15000,
            target_date: "2026-07-15",
          },
        ],
      }),
    );
    expect(goal?.remainingAmount).toBe(45000);
    expect(goal?.progressPercent).toBe(25);
    expect(goal?.monthsRemaining).toBe(6);
    expect(goal?.monthlyContributionEstimate).toBe(7500);
    expect(goal?.horizon).toBe("short");
  });

  it("classifies a distant goal as long horizon", () => {
    const [goal] = analyseGoals(
      input({
        goals: [
          { name: "House", target_amount: 3000000, current_amount: 0, target_date: "2036-01-15" },
        ],
      }),
    );
    expect(goal?.horizon).toBe("long");
    expect(goal?.monthsRemaining).toBe(120);
  });

  it("marks a fully funded goal", () => {
    const [goal] = analyseGoals(
      input({ goals: [{ name: "Course", target_amount: 20000, current_amount: 20000 }] }),
    );
    expect(goal?.isFunded).toBe(true);
    expect(goal?.remainingAmount).toBe(0);
  });

  it("prioritises a short-term goal once basics are covered", () => {
    const result = analysePlan(
      input({
        savings: [{ kind: "bank", amount: 28000 * 6 }],
        goals: [
          {
            name: "Course fee",
            target_amount: 50000,
            current_amount: 0,
            target_date: "2026-10-15",
          },
        ],
      }),
    );
    expect(result.primaryAction.code).toBe("D");
  });

  it("ignores deleted goals", () => {
    expect(
      analyseGoals(
        input({
          goals: [{ name: "Old", target_amount: 1000, current_amount: 0, status: "deleted" }],
        }),
      ),
    ).toHaveLength(0);
  });
});

describe("allocation and risk", () => {
  it("produces slices totalling 100 percent for every risk profile", () => {
    for (const profile of ["conservative", "moderate", "higher_risk"] as const) {
      const result = analysePlan(
        input({
          riskProfile: profile,
          investmentExperience: "regular",
          savings: [{ kind: "bank", amount: 28000 * 6 }],
        }),
      );
      const total = result.allocation.reduce((sum, slice) => sum + slice.percent, 0);
      expect(total).toBe(100);
      expect(result.allocation.every((slice) => slice.amount >= 0)).toBe(true);
    }
  });

  it("reaches the long-term investing priority when basics are covered", () => {
    const result = analysePlan(
      input({ savings: [{ kind: "bank", amount: 28000 * 6 }], investmentExperience: "a_little" }),
    );
    expect(result.primaryAction.code).toBe("E");
    expect(result.investableMonthly).toBeGreaterThan(0);
  });

  it("reviews the mix for an existing, diversified investor", () => {
    const result = analysePlan(
      input({
        savings: [{ kind: "bank", amount: 28000 * 6 }],
        investmentExperience: "regular",
        investments: [
          { kind: "mutual_funds", current_value: 120000, monthly_contribution: 6000 },
          { kind: "fixed_deposits", current_value: 80000, monthly_contribution: 2000 },
          { kind: "gold", current_value: 40000, monthly_contribution: 1000 },
        ],
      }),
    );
    expect(result.priorities.some((item) => item.code === "F")).toBe(true);
  });

  it("uses beginner mode for people with no experience", () => {
    expect(analysePlan(input({ investmentExperience: "none" })).beginnerMode).toBe(true);
    expect(analysePlan(input({ investmentExperience: "unsure" })).beginnerMode).toBe(true);
    expect(analysePlan(input({ investmentExperience: "regular" })).beginnerMode).toBe(false);
  });

  it("maps risk scores to educational profiles", () => {
    expect(riskProfileFromScore(0)).toBe("conservative");
    expect(riskProfileFromScore(6)).toBe("moderate");
    expect(riskProfileFromScore(12)).toBe("higher_risk");
  });
});

describe("invalid input handling", () => {
  it("treats negative and non-numeric figures as zero instead of breaking", () => {
    const result = analysePlan(
      input({
        incomes: [{ kind: "salary", monthly_amount: -5000 }],
        expenses: [{ category: "rent", monthly_amount: Number.NaN, is_essential: true }],
        savings: [{ kind: "bank", amount: -100 }],
      }),
    );
    expect(result.totalIncome).toBe(0);
    expect(result.totalExpenses).toBe(0);
    expect(result.totalSavings).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.primaryAction).toBeTruthy();
  });

  it("ignores an unparseable goal date rather than inventing a schedule", () => {
    const [goal] = analyseGoals(
      input({
        goals: [
          { name: "Trip", target_amount: 20000, current_amount: 0, target_date: "not-a-date" },
        ],
      }),
    );
    expect(goal?.monthsRemaining).toBeNull();
    expect(goal?.monthlyContributionEstimate).toBeNull();
    expect(goal?.horizon).toBe("unknown");
  });

  it("always returns an ordered priority list with a journey stage in progress", () => {
    const result = analysePlan(input());
    expect(result.priorities.length).toBeGreaterThan(0);
    expect(result.priorities[0]).toEqual(result.primaryAction);
    expect(result.journey.some((stage) => stage.state === "current")).toBe(true);
  });

  it("keeps the expensive-debt threshold configurable and documented", () => {
    expect(PLANNER_RULES.expensiveDebtRate).toBeGreaterThan(0);
    expect(PLANNER_RULES.defaultEmergencyMonths).toBeGreaterThan(0);
  });
});
