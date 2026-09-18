/**
 * Types for the personalised investment opportunity engine.
 *
 * These describe the structured result the UI receives. Everything here is
 * produced by pure functions in assetEngine.ts from the person's own numbers.
 */

export type RiskBand =
  "conservative" | "moderately_conservative" | "moderate" | "moderately_aggressive" | "aggressive";

export type Suitability = "strong_fit" | "potential_fit" | "limited_fit" | "not_suitable";

export type RiskLevel = "low" | "moderate" | "high";
export type LiquidityLevel = "high" | "moderate" | "low";
export type HorizonBand = "short" | "medium" | "long" | "very_long";

export interface RiskFactor {
  key: string;
  label: string;
  /** Positive means it supports taking more investment risk. */
  effect: number;
  explanation: string;
}

export interface RiskAssessment {
  band: RiskBand;
  label: string;
  /** 0-100 internal figure. Shown as a band, never as a precise measurement. */
  score: number;
  /** Set when basic financial priorities cap the band regardless of answers. */
  cappedByPriorities: boolean;
  factors: RiskFactor[];
  /** Beginner-friendly paragraph explaining how the band was reached. */
  explanation: string;
  reviewNote: string;
}

export interface InvestmentCapacity {
  /** Accessible savings the person holds today. */
  availableCapital: number;
  /** Money that should stay reachable: reserve plus near-term goals. */
  liquidReserve: number;
  emergencyReserveComponent: number;
  shortTermGoalComponent: number;
  /** Lump sum that could reasonably be considered for investing today. */
  oneTime: number;
  /** Amount per month that could reasonably be considered for investing. */
  monthly: number;
  monthlySurplus: number;
  committedMonthly: number;
  existingInvestments: number;
  notes: string[];
}

export interface AssetExplanation {
  what: string;
  why: string;
  risk: string;
  time: string;
  liquidity: string;
  howMuch: string;
  whatNext: string;
}

export interface AssetClassResult {
  key: string;
  label: string;
  group: "cash" | "fixed_income" | "equity" | "diversifier" | "property";
  suitability: Suitability;
  suitabilityLabel: string;
  /** Internal 0-100 figure. Rendered as a band, never as a precise score. */
  score: number;
  role: string;
  riskLevel: RiskLevel;
  liquidity: LiquidityLevel;
  horizon: HorizonBand;
  horizonLabel: string;
  minimumCapitalNote: string;
  volatilityNote: string;
  diversificationValue: string;
  whyItMayFit: string[];
  whyItMayNotFit: string[];
  /** Illustrative share of investable money, when the class is in the framework. */
  suggestedSharePercent: number | null;
  suggestedRangePercent: [number, number] | null;
  suggestedOneTimeAmount: number | null;
  suggestedMonthlyAmount: number | null;
  explanation: AssetExplanation;
  beginnerNote: string;
}

export interface AllocationFrameworkRow {
  key: string;
  label: string;
  role: string;
  percent: number;
  rangePercent: [number, number];
  oneTimeAmount: number;
  monthlyAmount: number;
}

export interface PortfolioGap {
  key: string;
  title: string;
  severity: "high" | "medium" | "low";
  explanation: string;
  suggestion: string;
}

export interface EquityOpportunities {
  /** False when the person's situation does not currently support equity. */
  appropriate: boolean;
  reason: string;
  ladder: {
    key: string;
    label: string;
    description: string;
    emphasis: "start_here" | "next" | "advanced";
  }[];
  researchList: EquityResearchItem[];
  researchNote: string;
}

export interface EquityResearchItem {
  id: string;
  name: string;
  sector: string;
  marketCapBand: "large" | "mid" | "small";
  revenueGrowthPercent: number;
  profitMarginPercent: number;
  debtToEquity: number;
  valuationBand: "lower" | "average" | "higher";
  volatilityBand: "lower" | "average" | "higher";
  matchReasons: string[];
  cautions: string[];
}

export interface MarketDataMeta {
  source: string;
  isLive: boolean;
  asOf: string;
  note: string;
}

export interface OpportunityReport {
  currency: string;
  risk: RiskAssessment;
  capacity: InvestmentCapacity;
  /** Priorities that come before investing, straight from the planner engine. */
  beforeInvesting: { blocking: boolean; heading: string; steps: string[]; explanation: string };
  assetClasses: AssetClassResult[];
  framework: AllocationFrameworkRow[];
  gaps: PortfolioGap[];
  equity: EquityOpportunities;
  lowCapitalMode: { active: boolean; heading: string; focus: string[]; explanation: string };
  market: MarketDataMeta;
  assumptions: string[];
}
