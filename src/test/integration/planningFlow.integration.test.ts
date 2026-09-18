/**
 * Integration test for the whole planning path that a signed-in request takes:
 *
 *   database rows -> toPlannerInput -> analysePlan (decision engine)
 *                 -> buildOpportunityReport (risk, capacity, suitability, allocation)
 *                 -> structured JSON returned to React
 *
 * It uses rows shaped exactly like the PostgreSQL tables, so a schema/mapping
 * mistake fails here even though no network is involved.
 */
import { describe, expect, it } from "vitest";

import { toPlannerInput, type FinancialSnapshot } from "@/lib/api/finance.functions";
import { analysePlan } from "@/lib/planner/engine";
import { buildOpportunityReport } from "@/lib/planner/assetEngine";
import type { MarketDataMeta } from "@/lib/planner/assetTypes";

const SAMPLE_MARKET: MarketDataMeta = {
  source: "Built-in sample data set",
  isLive: false,
  asOf: "2026-01-01",
  note: "Sample data for illustration, not live market prices.",
};

const USER = "11111111-1111-1111-1111-111111111111";
const now = "2026-01-01T00:00:00.000Z";

type Snapshot = FinancialSnapshot;

function rows(overrides: Partial<Snapshot> = {}): Snapshot {
  const base: Snapshot = {
    profile: {
      id: USER,
      display_name: "Test Person",
      currency: "INR",
      onboarding_completed: true,
      onboarding_step: 9,
      created_at: now,
      updated_at: now,
    },
    financialProfile: {
      id: "fp-1",
      user_id: USER,
      age_range: "18-24",
      occupation: "student",
      income_stability: "varies",
      investment_experience: "none",
      risk_answers: { reaction: 2, horizon: 2, steadiness: 2 },
      risk_score: 6,
      risk_profile: "moderate",
      emergency_months_target: 6,
      has_debt: false,
      created_at: now,
      updated_at: now,
    },
    incomes: [
      {
        id: "i-1",
        user_id: USER,
        kind: "salary",
        label: null,
        monthly_amount: 50000,
        created_at: now,
        updated_at: now,
      },
    ],
    expenses: [
      {
        id: "e-1",
        user_id: USER,
        category: "rent",
        monthly_amount: 20000,
        is_essential: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: "e-2",
        user_id: USER,
        category: "food",
        monthly_amount: 12000,
        is_essential: true,
        created_at: now,
        updated_at: now,
      },
    ],
    savings: [
      { id: "s-1", user_id: USER, kind: "bank", amount: 60000, created_at: now, updated_at: now },
    ],
    debts: [],
    investments: [
      {
        id: "v-1",
        user_id: USER,
        kind: "mutual_funds",
        current_value: 20000,
        monthly_contribution: 2000,
        created_at: now,
        updated_at: now,
      },
    ],
    goals: [
      {
        id: "g-1",
        user_id: USER,
        name: "Higher studies",
        category: "education",
        target_amount: 300000,
        current_amount: 20000,
        target_date: "2029-01-01",
        priority: 1,
        status: "active",
        created_at: now,
        updated_at: now,
      },
    ],
  };
  return { ...base, ...overrides } as Snapshot;
}

describe("integration: stored rows through the decision engines", () => {
  it("maps database rows into engine input without losing values", () => {
    const input = toPlannerInput(rows());
    expect(input.currency).toBe("INR");
    expect(input.riskProfile).toBe("moderate");
    expect(input.riskScore).toBe(6);
    expect(input.incomeStability).toBe("varies");
    expect(input.incomes).toHaveLength(1);
    expect(input.expenses.reduce((sum, e) => sum + e.monthly_amount, 0)).toBe(32000);
    expect(input.goals[0]?.target_amount).toBe(300000);
  });

  it("produces an explainable primary recommendation from those rows", () => {
    const analysis = analysePlan(toPlannerInput(rows()));
    expect(analysis.totalIncome).toBe(50000);
    expect(analysis.totalExpenses).toBe(32000);
    expect(analysis.monthlySurplus).toBe(18000);
    // One primary action, always carrying its explanation.
    expect(analysis.primaryAction.code).toMatch(/^[A-F]$/);
    expect(analysis.primaryAction.why.length).toBeGreaterThan(20);
    expect(analysis.primaryAction.how.length).toBeGreaterThan(10);
    expect(analysis.primaryAction.afterThis.length).toBeGreaterThan(10);
  });

  it("returns a complete structured investment report for the same rows", () => {
    const input = toPlannerInput(rows());
    const analysis = analysePlan(input);
    const report = buildOpportunityReport(input, analysis, { market: SAMPLE_MARKET });

    expect(report.risk.band).toBeTruthy();
    expect(report.risk.factors.length).toBeGreaterThanOrEqual(5);
    expect(report.capacity.monthly).toBeGreaterThanOrEqual(0);
    expect(report.capacity.oneTime).toBeGreaterThanOrEqual(0);
    expect(report.capacity.liquidReserve).toBeGreaterThan(0);
    expect(report.assetClasses.length).toBeGreaterThan(5);

    for (const asset of report.assetClasses) {
      expect(asset.suitability).toMatch(/strong_fit|potential_fit|limited_fit|not_suitable/);
      expect(asset.explanation.what).toBeTruthy();
      expect(asset.explanation.why).toBeTruthy();
      expect(asset.explanation.risk).toBeTruthy();
      expect(asset.explanation.whatNext).toBeTruthy();
    }

    if (report.framework.length > 0) {
      const total = report.framework.reduce((sum, row) => sum + row.percent, 0);
      expect(Math.round(total)).toBe(100);
    }
    // Sample company data must never be presented as live prices.
    expect(report.market.isLive).toBe(false);
  });

  it("puts basic priorities before aggressive investing even for a risk-tolerant user", () => {
    const risky = rows({
      financialProfile: {
        ...rows().financialProfile!,
        risk_profile: "higher_risk",
        risk_score: 12,
        income_stability: "irregular",
        has_debt: true,
      },
      savings: [],
      debts: [
        {
          id: "d-1",
          user_id: USER,
          kind: "credit_card",
          outstanding_amount: 80000,
          monthly_payment: 4000,
          interest_rate: 38,
          created_at: now,
          updated_at: now,
        },
      ],
    });

    const input = toPlannerInput(risky);
    const analysis = analysePlan(input);
    const report = buildOpportunityReport(input, analysis, { market: SAMPLE_MARKET });

    expect(report.beforeInvesting.steps.length).toBeGreaterThan(0);
    expect(report.beforeInvesting.blocking).toBe(true);
    expect(report.risk.band).not.toBe("aggressive");
    const equity = report.assetClasses.find((a) => a.key === "direct_stocks");
    expect(equity?.suitability).not.toBe("strong_fit");
  });
});
