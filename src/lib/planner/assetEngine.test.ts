import { describe, expect, it } from "vitest";

import { analysePlan } from "./engine";
import {
  buildOpportunityReport,
  calculateInvestmentCapacity,
  calculateLiquidityRequirement,
  calculateRiskProfile,
  generateAllocationFramework,
  generatePortfolioGapAnalysis,
} from "./assetEngine";
import type { MarketDataMeta } from "./assetTypes";
import type { PlannerInput } from "./types";
import { buildScreenCriteria, screenCompanies } from "@/lib/market/screener";
import { SAMPLE_COMPANIES } from "@/lib/market/sampleUniverse";

const TODAY = new Date("2026-01-15T00:00:00Z");

const MARKET: MarketDataMeta = {
  source: "Built-in sample data set",
  isLive: false,
  asOf: "2026-01-01T00:00:00.000Z",
  note: "Sample data.",
};

function input(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
    currency: "INR",
    riskProfile: "moderate",
    investmentExperience: "none",
    emergencyMonthsTarget: 6,
    incomeStability: "steady",
    riskScore: 7,
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

/** A person with reserve covered, no debt and a distant goal. */
const funded = () =>
  input({
    savings: [{ kind: "emergency", amount: 400000 }],
    riskScore: 11,
    investmentExperience: "regular",
    goals: [
      {
        name: "Retirement",
        target_amount: 5000000,
        current_amount: 100000,
        target_date: "2046-01-01",
      },
    ],
  });

const report = (i: PlannerInput) => buildOpportunityReport(i, analysePlan(i), { market: MARKET });

describe("risk profile", () => {
  it("uses many inputs, not just the questionnaire", () => {
    const strong = calculateRiskProfile(funded(), analysePlan(funded()));
    const weak = calculateRiskProfile(
      input({ riskScore: 11 }),
      analysePlan(input({ riskScore: 11 })),
    );
    expect(strong.factors.length).toBeGreaterThanOrEqual(7);
    expect(strong.score).toBeGreaterThan(weak.score);
  });

  it("caps the band when basic priorities are unresolved", () => {
    const i = input({ riskScore: 12, savings: [], investmentExperience: "regular" });
    const risk = calculateRiskProfile(i, analysePlan(i));
    expect(risk.cappedByPriorities).toBe(true);
    expect(["conservative", "moderately_conservative", "moderate"]).toContain(risk.band);
  });

  it("reaches an aggressive band only with foundations in place", () => {
    const risk = calculateRiskProfile(funded(), analysePlan(funded()));
    expect(risk.cappedByPriorities).toBe(false);
    expect(["moderately_aggressive", "aggressive"]).toContain(risk.band);
  });

  it("lowers the band when income is irregular", () => {
    const steady = calculateRiskProfile(funded(), analysePlan(funded()));
    const shaky = { ...funded(), incomeStability: "irregular" as const };
    expect(calculateRiskProfile(shaky, analysePlan(shaky)).score).toBeLessThan(steady.score);
  });

  it("describes the profile as changeable rather than permanent", () => {
    expect(calculateRiskProfile(input(), analysePlan(input())).reviewNote).toMatch(
      /not a permanent/i,
    );
  });
});

describe("liquidity and capacity", () => {
  it("keeps the reserve and near-term goals reachable", () => {
    const i = input({
      goals: [
        { name: "Laptop", target_amount: 60000, current_amount: 10000, target_date: "2026-09-01" },
      ],
    });
    const liquidity = calculateLiquidityRequirement(analysePlan(i));
    expect(liquidity.emergencyComponent).toBeGreaterThan(0);
    expect(liquidity.shortTermGoalComponent).toBe(50000);
    expect(liquidity.total).toBe(liquidity.emergencyComponent + liquidity.shortTermGoalComponent);
  });

  it("never treats the whole balance as investable", () => {
    const capacity = calculateInvestmentCapacity(analysePlan(input()));
    expect(capacity.availableCapital).toBe(60000);
    expect(capacity.oneTime).toBeLessThan(capacity.availableCapital);
  });

  it("reports no investable money when there is no surplus", () => {
    const i = input({
      expenses: [{ category: "rent", monthly_amount: 60000, is_essential: true }],
    });
    const capacity = calculateInvestmentCapacity(analysePlan(i));
    expect(capacity.monthly).toBe(0);
  });

  it("sets money aside for an emergency shortfall before investing", () => {
    const capacity = calculateInvestmentCapacity(analysePlan(input({ savings: [] })));
    expect(capacity.committedMonthly).toBeGreaterThan(0);
    expect(capacity.monthly).toBeLessThan(capacity.monthlySurplus);
  });

  it("frees a lump sum once the reserve is covered", () => {
    const capacity = calculateInvestmentCapacity(analysePlan(funded()));
    expect(capacity.oneTime).toBeGreaterThan(0);
  });
});

describe("asset class suitability", () => {
  it("does not mark every category as a fit", () => {
    const result = report(input());
    const fits = result.assetClasses.filter((a) => a.suitability === "strong_fit");
    expect(fits.length).toBeLessThan(result.assetClasses.length);
    expect(
      result.assetClasses.some(
        (a) => a.suitability === "not_suitable" || a.suitability === "limited_fit",
      ),
    ).toBe(true);
  });

  it("rules out direct property when capital is far too low", () => {
    const property = report(input()).assetClasses.find((a) => a.key === "direct_real_estate");
    expect(property?.suitability).toBe("not_suitable");
    expect(property?.whyItMayNotFit.join(" ")).toMatch(/investable capital/i);
  });

  it("keeps individual shares out of reach for beginners", () => {
    const stocks = report(funded()).assetClasses.find((a) => a.key === "direct_stocks");
    expect(stocks).toBeDefined();
    const beginner = report(input({ investmentExperience: "none" })).assetClasses.find(
      (a) => a.key === "direct_stocks",
    );
    expect(["limited_fit", "not_suitable"]).toContain(beginner?.suitability);
  });

  it("holds growth categories back while priorities are unresolved", () => {
    const result = report(input({ savings: [], riskScore: 12 }));
    const equity = result.assetClasses.filter((a) => a.group === "equity");
    expect(
      equity.every((a) => a.suitability === "limited_fit" || a.suitability === "not_suitable"),
    ).toBe(true);
  });

  it("answers what, why, risk, time, liquidity, how much and what next for each", () => {
    for (const asset of report(funded()).assetClasses) {
      for (const field of [
        "what",
        "why",
        "risk",
        "time",
        "liquidity",
        "howMuch",
        "whatNext",
      ] as const) {
        expect(asset.explanation[field].length).toBeGreaterThan(10);
      }
    }
  });

  it("never promises a return", () => {
    const text = JSON.stringify(report(funded()));
    expect(text).not.toMatch(/sure-shot|buy immediately|guaranteed (profit|return|gain)/i);
    // Any mention of a value rising is only ever inside a disclaimer.
    for (const sentence of text.split(/(?<=\.)\s+/)) {
      if (/will rise/i.test(sentence)) expect(sentence).toMatch(/not a guarantee|no guarantee/i);
    }
  });
});

describe("allocation framework", () => {
  it("totals 100 per cent", () => {
    const result = report(funded());
    const total = result.framework.reduce((sum, row) => sum + row.percent, 0);
    expect(total).toBe(100);
  });

  it("differs between two different people", () => {
    const cautious = report(input({ riskScore: 1 }));
    const bold = report(funded());
    expect(JSON.stringify(cautious.framework)).not.toBe(JSON.stringify(bold.framework));
  });

  it("falls back to stable categories when nothing else fits", () => {
    const rows = generateAllocationFramework(
      [],
      "conservative",
      calculateInvestmentCapacity(analysePlan(input())),
    );
    expect(rows).toEqual([]);
  });
});

describe("gap analysis", () => {
  it("flags a thin reserve", () => {
    const analysis = analysePlan(input({ savings: [] }));
    const gaps = generatePortfolioGapAnalysis(
      analysis,
      calculateInvestmentCapacity(analysis),
      calculateRiskProfile(input({ savings: [] }), analysis),
    );
    expect(gaps.some((gap) => gap.key === "reserve")).toBe(true);
  });

  it("flags a single-category portfolio", () => {
    const i = funded();
    i.investments = [{ kind: "equity_funds", current_value: 200000, monthly_contribution: 5000 }];
    const analysis = analysePlan(i);
    const gaps = generatePortfolioGapAnalysis(
      analysis,
      calculateInvestmentCapacity(analysis),
      calculateRiskProfile(i, analysis),
    );
    expect(gaps.some((gap) => gap.key === "concentration")).toBe(true);
  });

  it("never tells the user to sell immediately", () => {
    const analysis = analysePlan(funded());
    const gaps = generatePortfolioGapAnalysis(
      analysis,
      calculateInvestmentCapacity(analysis),
      calculateRiskProfile(funded(), analysis),
    );
    expect(gaps.map((gap) => gap.suggestion).join(" ")).not.toMatch(/sell (it|everything|now)/i);
  });
});

describe("report shape and modes", () => {
  it("puts priorities before investing when the plan says so", () => {
    const result = report(input({ savings: [] }));
    expect(result.beforeInvesting.blocking).toBe(true);
    expect(result.beforeInvesting.steps.length).toBeGreaterThan(0);
  });

  it("turns on the low-capital mode for a small surplus", () => {
    const i = input({
      incomes: [{ kind: "internship", monthly_amount: 12000 }],
      expenses: [{ category: "food", monthly_amount: 11000, is_essential: true }],
      savings: [],
    });
    expect(report(i).lowCapitalMode.active).toBe(true);
  });

  it("labels sample market data as not live", () => {
    expect(report(funded()).market.isLive).toBe(false);
  });

  it("hides the company research list for beginners", () => {
    expect(report(input()).equity.researchList).toEqual([]);
  });
});

describe("company screen", () => {
  it("applies stricter criteria for a conservative band", () => {
    const cautious = screenCompanies(SAMPLE_COMPANIES, buildScreenCriteria("conservative", 120));
    const bold = screenCompanies(SAMPLE_COMPANIES, buildScreenCriteria("aggressive", 120));
    expect(cautious.length).toBeLessThanOrEqual(bold.length);
    expect(cautious.every((item) => item.marketCapBand === "large")).toBe(true);
  });

  it("gives reasons and cautions for every entry", () => {
    for (const item of screenCompanies(
      SAMPLE_COMPANIES,
      buildScreenCriteria("moderately_aggressive", 120),
    )) {
      expect(item.matchReasons.length).toBeGreaterThan(0);
      expect(item.cautions.length).toBeGreaterThan(0);
    }
  });

  it("keeps the list spread across sectors", () => {
    const items = screenCompanies(SAMPLE_COMPANIES, buildScreenCriteria("moderate", 120));
    expect(new Set(items.map((item) => item.sector)).size).toBe(items.length);
  });
});
