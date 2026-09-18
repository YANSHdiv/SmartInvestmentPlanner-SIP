/**
 * Configurable planning rules.
 *
 * Every assumption the decision engine makes lives here so it can be reviewed,
 * documented and adjusted in one place. None of these values are predictions
 * about markets — they are planning conventions used for estimates only.
 */

export const PLANNER_RULES = {
  /** Default emergency-fund target, in months of essential expenses. */
  defaultEmergencyMonths: 6,
  /** Below this many months of coverage, building reserves outranks investing. */
  minimumEmergencyMonths: 1,
  /** Interest rate (annual %) at or above which debt is treated as expensive. */
  expensiveDebtRate: 12,
  /** Debt payments above this share of income are flagged as heavy. */
  heavyDebtToIncomeRatio: 0.4,
  /** Goals due within this many months are treated as short-term. */
  shortTermGoalMonths: 24,
  /** Goals due beyond this many months are treated as long-term. */
  longTermGoalMonths: 60,
  /** Share of surplus suggested for the current priority. */
  priorityShareOfSurplus: 0.6,
  /** Minimum surplus rate considered a comfortable cash-flow buffer. */
  healthySurplusRate: 0.1,
  /** Number of distinct investment kinds treated as reasonably diversified. */
  diversifiedKindCount: 3,
} as const;

/** Allocation templates per educational risk profile. Percentages total 100. */
export const ALLOCATION_TEMPLATES = {
  conservative: [
    { key: "savings", percent: 30 },
    { key: "fixed_deposits", percent: 25 },
    { key: "bonds", percent: 20 },
    { key: "mutual_funds", percent: 15 },
    { key: "gold", percent: 10 },
  ],
  moderate: [
    { key: "savings", percent: 15 },
    { key: "fixed_deposits", percent: 15 },
    { key: "bonds", percent: 15 },
    { key: "mutual_funds", percent: 35 },
    { key: "stocks", percent: 10 },
    { key: "gold", percent: 10 },
  ],
  higher_risk: [
    { key: "savings", percent: 10 },
    { key: "fixed_deposits", percent: 5 },
    { key: "bonds", percent: 10 },
    { key: "mutual_funds", percent: 40 },
    { key: "stocks", percent: 27 },
    { key: "gold", percent: 8 },
  ],
} as const;

export const ASSET_CLASS_META: Record<
  string,
  { label: string; purpose: string; riskNote: string; complexity: "lower" | "moderate" | "higher" }
> = {
  savings: {
    label: "Accessible savings",
    purpose: "Money you can reach quickly for emergencies and near-term needs.",
    riskNote:
      "Value does not usually fluctuate, but returns are typically low and may trail inflation.",
    complexity: "lower",
  },
  fixed_deposits: {
    label: "Fixed deposits",
    purpose: "Money set aside for a fixed period at a pre-agreed rate.",
    riskNote: "Fairly predictable, but withdrawing early can reduce what you receive.",
    complexity: "lower",
  },
  bonds: {
    label: "Bonds / fixed income",
    purpose: "Lending money to a government or company in exchange for interest.",
    riskNote: "Usually steadier than shares, though prices can move and issuers can default.",
    complexity: "moderate",
  },
  mutual_funds: {
    label: "Mutual funds",
    purpose:
      "A pooled, professionally managed basket of investments — often a beginner's starting point.",
    riskNote:
      "Values fluctuate with the underlying holdings; costs and mandates differ between funds.",
    complexity: "moderate",
  },
  stocks: {
    label: "Stocks",
    purpose: "Direct part-ownership of individual companies.",
    riskNote: "Values can fluctuate sharply, including falling for long stretches.",
    complexity: "higher",
  },
  gold: {
    label: "Gold",
    purpose: "Often held as a diversifier alongside other holdings.",
    riskNote: "Prices can be volatile and it produces no interest or dividend.",
    complexity: "moderate",
  },
  ppf: {
    label: "Long-term savings scheme",
    purpose: "Long-horizon savings with restricted access.",
    riskNote: "Low fluctuation, but your money is locked in for extended periods.",
    complexity: "lower",
  },
  other: {
    label: "Other",
    purpose: "Anything that does not fit the categories above.",
    riskNote: "Risk depends entirely on what is held — review it individually.",
    complexity: "moderate",
  },
};

export const DISCLAIMER =
  "This application provides educational information, planning calculations and simplified scenarios based on information provided by the user. It is not individualized professional financial, investment, tax or legal advice. Investment values can fluctuate and past performance does not guarantee future results.";
