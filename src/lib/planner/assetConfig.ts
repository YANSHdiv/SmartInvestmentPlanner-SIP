/**
 * Configurable rules for the investment opportunity engine.
 *
 * All planning conventions live here so they can be reviewed and adjusted in
 * one place. None of these values are predictions about markets, and no
 * expected returns are stored anywhere in this file.
 *
 * Capital requirements are expressed as multiples of the person's own monthly
 * income or monthly surplus so the rules work in any currency.
 */

import type { HorizonBand, LiquidityLevel, RiskBand, RiskLevel } from "./assetTypes";

export const OPPORTUNITY_RULES = {
  /** Band boundaries for the 0-100 risk figure. */
  riskBands: [
    { max: 24, band: "conservative" as RiskBand },
    { max: 42, band: "moderately_conservative" as RiskBand },
    { max: 60, band: "moderate" as RiskBand },
    { max: 78, band: "moderately_aggressive" as RiskBand },
    { max: 100, band: "aggressive" as RiskBand },
  ],
  /** Highest band allowed while basic financial priorities are unmet. */
  cappedBand: "moderately_conservative" as RiskBand,
  /** Share of the emergency-fund gap planned for over this many months. */
  emergencyGapSpreadMonths: 12,
  /** Monthly capacity below this share of income triggers low-capital mode. */
  lowCapitalIncomeShare: 0.05,
  /** A single holding above this share of the portfolio is called concentrated. */
  concentrationShare: 0.6,
  /** Distinct holdings below this count are called under-diversified. */
  minimumHoldingKinds: 3,
  /** Suitability band boundaries for the 0-100 asset-class figure. */
  suitabilityBands: [
    { min: 70, key: "strong_fit" as const },
    { min: 50, key: "potential_fit" as const },
    { min: 30, key: "limited_fit" as const },
  ],
} as const;

export const RISK_BAND_LABELS: Record<RiskBand, string> = {
  conservative: "Conservative",
  moderately_conservative: "Moderately conservative",
  moderate: "Moderate",
  moderately_aggressive: "Moderately aggressive",
  aggressive: "Aggressive",
};

export const SUITABILITY_LABELS = {
  strong_fit: "Strong fit",
  potential_fit: "Potential fit",
  limited_fit: "Limited fit",
  not_suitable: "Currently not suitable",
} as const;

export const HORIZON_LABELS: Record<HorizonBand, string> = {
  short: "Under 2 years",
  medium: "2 to 5 years",
  long: "5 to 10 years",
  very_long: "10 years or more",
};

export interface AssetClassMeta {
  key: string;
  label: string;
  group: "cash" | "fixed_income" | "equity" | "diversifier" | "property";
  role: string;
  riskLevel: RiskLevel;
  liquidity: LiquidityLevel;
  horizon: HorizonBand;
  /** Minimum practical lump sum, as a multiple of monthly income. 0 = none. */
  minCapitalIncomeMultiple: number;
  volatilityNote: string;
  diversificationValue: string;
  /** Plain-language description used in beginner mode. */
  beginnerNote: string;
  /** What to understand before putting money in. */
  whatNext: string;
  /** Complexity for people new to investing. */
  experienceNeeded: "none" | "some" | "considerable";
}

/**
 * The asset classes the engine can evaluate. Nothing here is recommended by
 * default — every class is scored against the person's own situation.
 */
export const ASSET_UNIVERSE: AssetClassMeta[] = [
  {
    key: "cash_liquid",
    label: "Cash and liquid savings",
    group: "cash",
    role: "Emergency reserve and money needed soon",
    riskLevel: "low",
    liquidity: "high",
    horizon: "short",
    minCapitalIncomeMultiple: 0,
    volatilityNote:
      "The amount does not usually move up or down, so the main risk is that prices rise faster than the interest you receive.",
    diversificationValue:
      "Not a growth holding, but it is what keeps you from having to sell other things at a bad moment.",
    beginnerNote:
      "This is ordinary money in a savings or liquid account that you can withdraw quickly.",
    whatNext: "Check how quickly you can withdraw and whether there are any limits or charges.",
    experienceNeeded: "none",
  },
  {
    key: "fixed_deposits",
    label: "Fixed deposits",
    group: "fixed_income",
    role: "Stability for money with a known date",
    riskLevel: "low",
    liquidity: "moderate",
    horizon: "medium",
    minCapitalIncomeMultiple: 0.1,
    volatilityNote:
      "The amount is fairly predictable, but taking money out early usually reduces what you receive.",
    diversificationValue: "Adds steadiness so the whole plan does not depend on markets.",
    beginnerNote:
      "You leave money with a bank for an agreed period and receive an agreed rate of interest.",
    whatNext:
      "Compare the term, the penalty for early withdrawal, and how the interest is taxed where you live.",
    experienceNeeded: "none",
  },
  {
    key: "debt_funds",
    label: "Debt and fixed-income funds",
    group: "fixed_income",
    role: "Steadier income-style holdings with easier access than a deposit",
    riskLevel: "moderate",
    liquidity: "high",
    horizon: "medium",
    minCapitalIncomeMultiple: 0.05,
    volatilityNote:
      "Usually steadier than shares, though the value can still fall and the borrowers can fail to pay.",
    diversificationValue:
      "Behaves differently from shares, which softens the swings of the whole plan.",
    beginnerNote:
      "A fund that mainly lends money out — to governments or companies — and passes on the interest.",
    whatNext:
      "Look at what the fund lends to, the ongoing charges and how long it suggests staying invested.",
    experienceNeeded: "some",
  },
  {
    key: "government_securities",
    label: "Government securities",
    group: "fixed_income",
    role: "Long-dated stability from a government borrower",
    riskLevel: "low",
    liquidity: "moderate",
    horizon: "long",
    minCapitalIncomeMultiple: 0.2,
    volatilityNote:
      "The government is a dependable borrower, but the price still moves when interest rates change.",
    diversificationValue: "Often the steadiest part of a long-term plan.",
    beginnerNote: "You lend money to the government for a set period in return for interest.",
    whatNext: "Understand the maturity date and what happens if you need the money before it.",
    experienceNeeded: "some",
  },
  {
    key: "gold",
    label: "Gold",
    group: "diversifier",
    role: "Diversification, not earnings",
    riskLevel: "moderate",
    liquidity: "moderate",
    horizon: "long",
    minCapitalIncomeMultiple: 0.05,
    volatilityNote:
      "Prices can swing a lot and there are quiet years. Gold does not pay interest or dividends.",
    diversificationValue:
      "Often moves differently from shares, so a small holding can steady the whole plan.",
    beginnerNote:
      "Gold may add balance to a plan, but it does not produce business earnings like a company or interest like a deposit.",
    whatNext:
      "Compare the cost of holding physical gold with market-traded gold, including storage and purity concerns.",
    experienceNeeded: "none",
  },
  {
    key: "gold_etf",
    label: "Market-traded gold",
    group: "diversifier",
    role: "Gold exposure without storing metal",
    riskLevel: "moderate",
    liquidity: "high",
    horizon: "long",
    minCapitalIncomeMultiple: 0.02,
    volatilityNote:
      "Tracks the gold price, so the same swings apply, minus a small ongoing charge.",
    diversificationValue:
      "Same role as gold, usually easier to buy in small amounts and sell quickly.",
    beginnerNote: "A fund whose value follows the gold price, bought and sold like any other fund.",
    whatNext: "Check the ongoing charge and how closely it has tracked the gold price.",
    experienceNeeded: "some",
  },
  {
    key: "index_funds",
    label: "Index funds",
    group: "equity",
    role: "Broad, low-cost long-term growth",
    riskLevel: "high",
    liquidity: "high",
    horizon: "long",
    minCapitalIncomeMultiple: 0.02,
    volatilityNote:
      "The value follows the whole market, so it can fall sharply and stay down for long stretches.",
    diversificationValue: "One purchase spreads money across many companies at once.",
    beginnerNote:
      "A fund that simply follows a whole market rather than trying to pick winners. Often where beginners start with shares.",
    whatNext:
      "Understand which market the index covers, the ongoing charge, and that you should not need this money for years.",
    experienceNeeded: "none",
  },
  {
    key: "equity_funds",
    label: "Diversified equity funds",
    group: "equity",
    role: "Long-term growth with a manager choosing the holdings",
    riskLevel: "high",
    liquidity: "high",
    horizon: "long",
    minCapitalIncomeMultiple: 0.02,
    volatilityNote:
      "Values fluctuate with the shares held, and the manager's choices may work out worse than the market.",
    diversificationValue:
      "Spreads money across many companies, though often fewer than an index fund.",
    beginnerNote: "A basket of company shares chosen and managed for you, bought in one go.",
    whatNext:
      "Read what the fund invests in, its ongoing charge, and how it behaved in falling markets.",
    experienceNeeded: "some",
  },
  {
    key: "direct_stocks",
    label: "Individual company shares",
    group: "equity",
    role: "Direct part-ownership of specific companies",
    riskLevel: "high",
    liquidity: "high",
    horizon: "very_long",
    minCapitalIncomeMultiple: 3,
    volatilityNote:
      "A single company can fall far more than the market, and can lose most of its value permanently.",
    diversificationValue:
      "Adds nothing on its own — diversification only comes from holding many, across different sectors.",
    beginnerNote:
      "Buying shares in one company at a time. This needs research per company and is usually taken up after diversified holdings.",
    whatNext:
      "Learn to read revenue, profit, debt and valuation before buying anything individually, and decide in advance how much of your money one company may ever represent.",
    experienceNeeded: "considerable",
  },
  {
    key: "reits",
    label: "Listed real-estate vehicles",
    group: "property",
    role: "Property exposure in small amounts",
    riskLevel: "high",
    liquidity: "high",
    horizon: "long",
    minCapitalIncomeMultiple: 0.1,
    volatilityNote:
      "Prices move like shares even though the underlying assets are buildings, and rental income can fall.",
    diversificationValue:
      "Adds property to a plan without needing the capital for a whole building.",
    beginnerNote:
      "A listed vehicle that owns rent-producing property; you buy a small share of it like a fund.",
    whatNext: "Look at what property it owns, how much it borrows, and how the income has varied.",
    experienceNeeded: "some",
  },
  {
    key: "direct_real_estate",
    label: "Direct property",
    group: "property",
    role: "Long-term holding, usually needing substantial capital",
    riskLevel: "high",
    liquidity: "low",
    horizon: "very_long",
    minCapitalIncomeMultiple: 36,
    volatilityNote:
      "One property is a single, undiversified asset with costs for tax, upkeep and transaction fees, and it can take months to sell.",
    diversificationValue:
      "Large, and usually crowds out everything else unless capital is substantial.",
    beginnerNote:
      "Buying a property outright or with a loan. It ties up a lot of money and cannot be sold quickly.",
    whatNext:
      "Consider the full cost of ownership, how long you would hold it, and never borrow beyond what your income comfortably supports.",
    experienceNeeded: "considerable",
  },
];

/**
 * Illustrative weights per risk band. These are planning starting points, not
 * guarantees or universally appropriate allocations, and the engine removes any
 * class the person's situation does not currently support before normalising.
 */
export const BAND_WEIGHTS: Record<RiskBand, Record<string, number>> = {
  conservative: {
    cash_liquid: 30,
    fixed_deposits: 25,
    debt_funds: 20,
    government_securities: 10,
    gold: 5,
    index_funds: 10,
  },
  moderately_conservative: {
    cash_liquid: 20,
    fixed_deposits: 20,
    debt_funds: 20,
    government_securities: 10,
    gold: 8,
    index_funds: 15,
    equity_funds: 7,
  },
  moderate: {
    cash_liquid: 12,
    fixed_deposits: 13,
    debt_funds: 15,
    government_securities: 5,
    gold: 8,
    index_funds: 25,
    equity_funds: 15,
    reits: 4,
    direct_stocks: 3,
  },
  moderately_aggressive: {
    cash_liquid: 8,
    fixed_deposits: 7,
    debt_funds: 12,
    gold: 7,
    index_funds: 30,
    equity_funds: 20,
    reits: 6,
    direct_stocks: 10,
  },
  aggressive: {
    cash_liquid: 5,
    debt_funds: 10,
    gold: 5,
    index_funds: 32,
    equity_funds: 22,
    reits: 8,
    direct_stocks: 18,
  },
};

export const OPPORTUNITY_DISCLAIMER =
  "This planner provides educational and personalised planning insights based on the information you provide. It is not a guarantee of investment performance or a substitute for professional financial advice. Investments involve risk, including possible loss of principal. Review current product information, costs, taxes and regulations before investing.";
