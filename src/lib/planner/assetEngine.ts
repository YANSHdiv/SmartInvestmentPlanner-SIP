/**
 * The personalised investment opportunity engine.
 *
 * Pure functions only. Given the planner analysis and the person's own inputs
 * it works out:
 *   calculateRiskProfile          — a five-band risk classification with reasons
 *   calculateLiquidityRequirement — money that should stay reachable
 *   calculateInvestmentCapacity   — lump sum and monthly amounts to consider
 *   evaluateAssetClassSuitability — each asset class judged independently
 *   generateAllocationFramework   — illustrative roles and ranges
 *   generateRecommendationExplanation — the WHAT/WHY/RISK/TIME/LIQUIDITY answers
 *   generatePortfolioGapAnalysis  — where the current holdings differ from the plan
 *   buildOpportunityReport        — the structured result the UI receives
 *
 * Nothing here predicts markets or assumes a rate of return. Financial
 * priorities from the planner engine always outrank stated risk tolerance.
 */

import {
  ASSET_UNIVERSE,
  BAND_WEIGHTS,
  HORIZON_LABELS,
  OPPORTUNITY_RULES,
  RISK_BAND_LABELS,
  SUITABILITY_LABELS,
  type AssetClassMeta,
} from "./assetConfig";
import type {
  AllocationFrameworkRow,
  AssetClassResult,
  AssetExplanation,
  EquityOpportunities,
  EquityResearchItem,
  HorizonBand,
  InvestmentCapacity,
  MarketDataMeta,
  OpportunityReport,
  PortfolioGap,
  RiskAssessment,
  RiskBand,
  RiskFactor,
  Suitability,
} from "./assetTypes";
import { PLANNER_RULES } from "./config";
import type { PlannerAnalysis, PlannerInput } from "./types";

const round = (value: number, dp = 0) => {
  const factor = 10 ** dp;
  return Math.round(value * factor) / factor;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const BAND_ORDER: RiskBand[] = [
  "conservative",
  "moderately_conservative",
  "moderate",
  "moderately_aggressive",
  "aggressive",
];

function bandFromScore(score: number): RiskBand {
  for (const entry of OPPORTUNITY_RULES.riskBands) {
    if (score <= entry.max) return entry.band;
  }
  return "aggressive";
}

/** The longest horizon any unfunded goal implies, used for risk and suitability. */
function longestGoalHorizon(analysis: PlannerAnalysis): HorizonBand | null {
  const open = analysis.goals.filter((goal) => !goal.isFunded && goal.monthsRemaining !== null);
  if (open.length === 0) return null;
  const months = Math.max(...open.map((goal) => goal.monthsRemaining ?? 0));
  if (months <= PLANNER_RULES.shortTermGoalMonths) return "short";
  if (months <= PLANNER_RULES.longTermGoalMonths) return "medium";
  if (months <= 120) return "long";
  return "very_long";
}

function shortestGoalHorizon(analysis: PlannerAnalysis): HorizonBand | null {
  const open = analysis.goals.filter((goal) => !goal.isFunded && goal.monthsRemaining !== null);
  if (open.length === 0) return null;
  const months = Math.min(...open.map((goal) => goal.monthsRemaining ?? 0));
  if (months <= PLANNER_RULES.shortTermGoalMonths) return "short";
  if (months <= PLANNER_RULES.longTermGoalMonths) return "medium";
  return "long";
}

/* ------------------------------------------------------------------ risk */

/**
 * Builds the five-band risk classification from many inputs, never from a
 * single question. Basic financial priorities can cap the band.
 */
export function calculateRiskProfile(
  input: PlannerInput,
  analysis: PlannerAnalysis,
): RiskAssessment {
  const factors: RiskFactor[] = [];
  let score = 30;

  // 1. The risk questionnaire, scaled to a maximum of 30 points.
  const answerScore =
    input.riskScore ?? { conservative: 3, moderate: 7, higher_risk: 11 }[analysis.riskProfile];
  const answerPoints = round((clamp(answerScore, 0, 12) / 12) * 30);
  score += answerPoints - 15;
  factors.push({
    key: "answers",
    label: "Your answers about falling values",
    effect: answerPoints - 15,
    explanation:
      answerPoints >= 20
        ? "You said you could keep going if the value of an investment fell for a while."
        : answerPoints >= 12
          ? "Your answers suggest you would accept some movement in value, but not a lot."
          : "Your answers suggest that a fall in value would be uncomfortable for you.",
  });

  // 2. Experience with investing.
  const experienceEffect = { none: -6, unsure: -8, a_little: 0, regular: 6 }[
    analysis.investmentExperience
  ];
  score += experienceEffect;
  factors.push({
    key: "experience",
    label: "Your experience so far",
    effect: experienceEffect,
    explanation:
      experienceEffect > 0
        ? "You already invest regularly, so you have seen values move before."
        : "You are new to investing, so the plan starts more cautiously than your answers alone would suggest.",
  });

  // 3. How long the money can stay invested.
  const horizon = longestGoalHorizon(analysis);
  const horizonEffect =
    horizon === null ? 0 : { short: -8, medium: 0, long: 6, very_long: 10 }[horizon];
  score += horizonEffect;
  factors.push({
    key: "horizon",
    label: "How long your money can stay invested",
    effect: horizonEffect,
    explanation:
      horizon === null
        ? "You have not set dated goals yet, so no particular time frame is assumed."
        : horizonEffect > 0
          ? "Your furthest goal is years away, which gives investments time to recover from bad stretches."
          : horizonEffect < 0
            ? "Your goals are close, and money needed soon is usually kept somewhere stable."
            : "Your goals sit in the middle distance, which supports a balanced approach.",
  });

  // 4. Income stability.
  const stabilityEffect: number = { steady: 5, varies: -3, irregular: -8 }[
    input.incomeStability ?? "varies"
  ];
  score += stabilityEffect;
  factors.push({
    key: "stability",
    label: "How steady your income is",
    effect: stabilityEffect,
    explanation:
      stabilityEffect > 0
        ? "Your income arrives at about the same level each month, which makes regular investing easier to keep up."
        : "Your income moves around, so more money is kept reachable before investing.",
  });

  // 5. Emergency reserve.
  const coverage = analysis.emergencyFund.coverageMonths;
  const targetMonths = analysis.emergencyFund.targetMonths;
  const emergencyEffect =
    coverage >= targetMonths ? 8 : coverage >= targetMonths / 2 ? 2 : coverage >= 1 ? -6 : -12;
  score += emergencyEffect;
  factors.push({
    key: "emergency",
    label: "Your emergency reserve",
    effect: emergencyEffect,
    explanation:
      emergencyEffect > 0
        ? "You have an adequate reserve, so a surprise expense would not force you to sell an investment at a bad moment."
        : "Your reserve does not yet cover your target, so the plan keeps risk lower until it does.",
  });

  // 6. Debt.
  const debtEffect = analysis.debt.hasExpensiveDebt
    ? -10
    : analysis.debt.debtToIncomeRatio > PLANNER_RULES.heavyDebtToIncomeRatio
      ? -6
      : analysis.debt.totalOutstanding === 0
        ? 3
        : 0;
  score += debtEffect;
  factors.push({
    key: "debt",
    label: "Your debt",
    effect: debtEffect,
    explanation:
      debtEffect < 0
        ? "You are paying interest at a level that usually outweighs what cautious investing is likely to add."
        : debtEffect > 0
          ? "You recorded no debt, so none of your income is committed to interest payments."
          : "Your debt payments are manageable against your income.",
  });

  // 7. Cash flow.
  const surplusEffect = analysis.monthlySurplus <= 0 ? -10 : analysis.surplusRate >= 0.2 ? 5 : 0;
  score += surplusEffect;
  factors.push({
    key: "cashflow",
    label: "What is left over each month",
    effect: surplusEffect,
    explanation:
      surplusEffect < 0
        ? "Your expenses are at or above your income, so there is nothing spare to invest yet."
        : surplusEffect > 0
          ? "A healthy share of your income is left over each month."
          : "You have some money left over each month, though not a large cushion.",
  });

  // 8. How much of the person's money would be at risk.
  const capitalAtRisk =
    analysis.accessibleSavings > 0
      ? Math.max(analysis.accessibleSavings - analysis.emergencyFund.targetAmount, 0) /
        analysis.accessibleSavings
      : 0;
  const concentrationEffect = analysis.accessibleSavings > 0 && capitalAtRisk < 0.2 ? -5 : 0;
  score += concentrationEffect;
  if (concentrationEffect !== 0) {
    factors.push({
      key: "capital_share",
      label: "How much of your money is spare",
      effect: concentrationEffect,
      explanation:
        "Almost all of your savings are needed as a reserve, so only a small part could be exposed to fluctuation.",
    });
  }

  score = clamp(round(score), 0, 100);
  let band = bandFromScore(score);

  const blocking =
    analysis.monthlySurplus <= 0 ||
    analysis.emergencyFund.coverageMonths < analysis.emergencyFund.targetMonths ||
    analysis.debt.hasExpensiveDebt;
  const cappedIndex = BAND_ORDER.indexOf(OPPORTUNITY_RULES.cappedBand);
  const cappedByPriorities = blocking && BAND_ORDER.indexOf(band) > cappedIndex;
  if (cappedByPriorities) band = OPPORTUNITY_RULES.cappedBand;

  const positives = factors.filter((f) => f.effect > 0).map((f) => f.explanation);
  const negatives = factors.filter((f) => f.effect < 0).map((f) => f.explanation);
  const explanation = [
    positives.length ? positives.join(" ") : "",
    negatives.length ? `At the same time: ${negatives.join(" ")}` : "",
    `Taking all of this together, the planner currently treats ${/^[aeiou]/i.test(RISK_BAND_LABELS[band]) ? "an" : "a"} ${RISK_BAND_LABELS[band].toLowerCase()} level of investment risk as more suitable for you.`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    band,
    label: RISK_BAND_LABELS[band],
    score,
    cappedByPriorities,
    factors,
    explanation,
    reviewNote:
      "This is a description of your current situation, not a permanent personality trait. It changes as your income, reserve, debt and goals change, and you can answer the questions again at any time.",
  };
}

/* ------------------------------------------------------------- capacity */

/** Money that should stay reachable: the reserve plus anything needed soon. */
export function calculateLiquidityRequirement(analysis: PlannerAnalysis): {
  total: number;
  emergencyComponent: number;
  shortTermGoalComponent: number;
} {
  const emergencyComponent = analysis.emergencyFund.targetAmount;
  const shortTermGoalComponent = round(
    analysis.goals
      .filter((goal) => !goal.isFunded && (goal.horizon === "short" || goal.horizon === "unknown"))
      .reduce((total, goal) => total + goal.remainingAmount, 0),
    2,
  );
  return {
    total: round(emergencyComponent + shortTermGoalComponent, 2),
    emergencyComponent,
    shortTermGoalComponent,
  };
}

/**
 * Works out what could reasonably be invested, rather than asking. Never treats
 * the whole bank balance as investable.
 */
export function calculateInvestmentCapacity(analysis: PlannerAnalysis): InvestmentCapacity {
  const liquidity = calculateLiquidityRequirement(analysis);
  const availableCapital = analysis.accessibleSavings;
  const oneTime = round(Math.max(availableCapital - liquidity.total, 0), 2);

  const emergencyGap = analysis.emergencyFund.gap;
  const emergencyMonthly =
    emergencyGap > 0
      ? round(
          Math.min(
            emergencyGap / OPPORTUNITY_RULES.emergencyGapSpreadMonths,
            Math.max(analysis.monthlySurplus, 0),
          ),
        )
      : 0;
  const shortTermGoalMonthly = round(
    analysis.goals
      .filter((goal) => !goal.isFunded && goal.horizon === "short")
      .reduce((total, goal) => total + (goal.monthlyContributionEstimate ?? 0), 0),
  );
  const debtCatchUp = analysis.debt.hasExpensiveDebt
    ? round(Math.max(analysis.monthlySurplus, 0) * 0.3)
    : 0;
  const committedMonthly = round(emergencyMonthly + shortTermGoalMonthly + debtCatchUp, 2);
  const monthly = round(Math.max(analysis.monthlySurplus - committedMonthly, 0), 2);

  const notes: string[] = [
    "Your reserve and anything needed within about two years are set aside first, and only what remains is treated as investable.",
  ];
  if (emergencyMonthly > 0)
    notes.push("Part of your monthly surplus is reserved for topping up your emergency fund.");
  if (shortTermGoalMonthly > 0)
    notes.push("Money your near-term goals need each month is set aside before investing.");
  if (debtCatchUp > 0)
    notes.push("A share of your surplus is reserved for paying down your highest-cost debt.");
  if (oneTime === 0 && availableCapital > 0)
    notes.push(
      "Your savings are currently all needed as a reserve, so no lump sum is treated as investable today.",
    );

  return {
    availableCapital,
    liquidReserve: liquidity.total,
    emergencyReserveComponent: liquidity.emergencyComponent,
    shortTermGoalComponent: liquidity.shortTermGoalComponent,
    oneTime,
    monthly,
    monthlySurplus: analysis.monthlySurplus,
    committedMonthly,
    existingInvestments: analysis.investments.totalValue,
    notes,
  };
}

/* --------------------------------------------------- asset suitability */

function suitabilityFromScore(score: number): Suitability {
  for (const entry of OPPORTUNITY_RULES.suitabilityBands) {
    if (score >= entry.min) return entry.key;
  }
  return "not_suitable";
}

function capSuitability(current: Suitability, cap: Suitability): Suitability {
  const order: Suitability[] = ["not_suitable", "limited_fit", "potential_fit", "strong_fit"];
  return order.indexOf(current) > order.indexOf(cap) ? cap : current;
}

/** Answers WHAT / WHY / RISK / TIME / LIQUIDITY / HOW MUCH / WHAT NEXT. */
export function generateRecommendationExplanation(
  meta: AssetClassMeta,
  args: {
    suitability: Suitability;
    whyItMayFit: string[];
    whyItMayNotFit: string[];
    sharePercent: number | null;
    formatMoney: (value: number) => string;
    oneTimeAmount: number | null;
    monthlyAmount: number | null;
  },
): AssetExplanation {
  const liquidityText = {
    high: "You could usually convert this into usable money within a few days.",
    moderate:
      "You can reach this money, but not instantly, and leaving early may cost you something.",
    low: "This money is hard to reach quickly; selling can take months.",
  }[meta.liquidity];

  const howMuch =
    args.sharePercent === null
      ? "No share of your investable money is suggested for this category at the moment."
      : `About ${args.sharePercent}% of what you can invest — roughly ${args.formatMoney(args.oneTimeAmount ?? 0)} of your lump sum and ${args.formatMoney(args.monthlyAmount ?? 0)} a month. This is an illustrative planning range, not a target you must hit.`;

  return {
    what: `${meta.label} — ${meta.role.toLowerCase()}.`,
    why: args.whyItMayFit.length
      ? args.whyItMayFit.join(" ")
      : "Nothing in your current situation points to this category yet.",
    risk: args.whyItMayNotFit.length
      ? `${meta.volatilityNote} ${args.whyItMayNotFit.join(" ")}`
      : meta.volatilityNote,
    time: `Usually considered for money you can leave alone for ${HORIZON_LABELS[meta.horizon].toLowerCase()}.`,
    liquidity: liquidityText,
    howMuch,
    whatNext: meta.whatNext,
  };
}

/** Scores one asset class against the person's situation. */
export function evaluateAssetClassSuitability(
  meta: AssetClassMeta,
  args: {
    risk: RiskAssessment;
    capacity: InvestmentCapacity;
    analysis: PlannerAnalysis;
    blocking: boolean;
    formatMoney: (value: number) => string;
  },
): AssetClassResult {
  const { risk, capacity, analysis, blocking } = args;
  const whyItMayFit: string[] = [];
  const whyItMayNotFit: string[] = [];
  let score = 50;

  // Match between the class risk level and the person's band.
  const bandIndex = BAND_ORDER.indexOf(risk.band);
  const classRiskIndex = { low: 0, moderate: 2, high: 4 }[meta.riskLevel];
  const distance = Math.abs(bandIndex - classRiskIndex);
  score += [18, 10, 2, -10, -22][distance] ?? -22;
  if (distance <= 1) {
    whyItMayFit.push(
      `Its level of movement in value lines up with your ${risk.label.toLowerCase()} profile.`,
    );
  } else if (classRiskIndex > bandIndex) {
    whyItMayNotFit.push(
      `It moves in value more than your ${risk.label.toLowerCase()} profile currently supports.`,
    );
  } else {
    whyItMayNotFit.push("On its own it may grow too slowly for the time frame your goals allow.");
  }

  // Horizon match.
  const goalHorizon = longestGoalHorizon(analysis);
  const nearTerm = shortestGoalHorizon(analysis) === "short";
  const classHorizonIndex = { short: 0, medium: 1, long: 2, very_long: 3 }[meta.horizon];
  const goalHorizonIndex =
    goalHorizon === null ? 2 : { short: 0, medium: 1, long: 2, very_long: 3 }[goalHorizon];
  if (classHorizonIndex <= goalHorizonIndex) {
    score += 10;
    whyItMayFit.push("Its usual holding period fits inside the time frame of your goals.");
  } else {
    score -= 12;
    whyItMayNotFit.push(
      "It usually needs longer than your goals allow before you would need the money.",
    );
  }
  if (nearTerm && meta.liquidity === "high" && meta.riskLevel === "low") {
    score += 8;
    whyItMayFit.push(
      "You have money needed soon, and this stays reachable without much movement in value.",
    );
  }

  // Liquidity requirement.
  if (meta.liquidity === "low" && capacity.oneTime < capacity.liquidReserve) {
    score -= 15;
    whyItMayNotFit.push(
      "Most of your money still needs to stay reachable, and this cannot be sold quickly.",
    );
  }

  // Capital sufficiency.
  const minimumCapital = round(meta.minCapitalIncomeMultiple * analysis.totalIncome);
  if (minimumCapital > 0 && capacity.oneTime < minimumCapital) {
    score -= meta.minCapitalIncomeMultiple >= 3 ? 35 : 12;
    whyItMayNotFit.push(
      `In practice this usually needs around ${args.formatMoney(minimumCapital)} or more of investable capital, and your investable lump sum today is ${args.formatMoney(capacity.oneTime)}.`,
    );
  } else if (minimumCapital > 0) {
    score += 5;
    whyItMayFit.push("Your investable capital is enough to make this practical.");
  }

  // Experience.
  if (meta.experienceNeeded === "considerable" && analysis.beginnerMode) {
    score -= 25;
    whyItMayNotFit.push(
      "It asks for research and decisions per holding, and you are still getting started.",
    );
  } else if (meta.experienceNeeded === "none" && analysis.beginnerMode) {
    score += 8;
    whyItMayFit.push("It is simple enough to understand fully before putting money in.");
  }

  // Existing exposure, so diversification is rewarded and concentration is not.
  const alreadyHeld = analysis.investments.kinds.some(
    (kind) => kind === meta.key || meta.key.startsWith(kind),
  );
  if (alreadyHeld) {
    const share =
      analysis.investments.totalValue > 0 ? 1 / Math.max(analysis.investments.kinds.length, 1) : 0;
    if (share > OPPORTUNITY_RULES.concentrationShare) {
      score -= 10;
      whyItMayNotFit.push(
        "You already hold a large share of your portfolio here, so adding more would concentrate it further.",
      );
    } else {
      whyItMayFit.push("You already hold some of this, so adding to it keeps things simple.");
    }
  } else if (meta.group !== "property" || meta.key === "reits") {
    score += 5;
    whyItMayFit.push(
      "You hold nothing in this category, so a small amount would spread your money more widely.",
    );
  }

  // Cash is judged differently: it is what the reserve is made of.
  if (meta.key === "cash_liquid") {
    if (analysis.emergencyFund.gap > 0) {
      score += 25;
      whyItMayFit.push(
        "Your emergency reserve is not yet at your target, and this is where that money belongs.",
      );
    } else {
      whyItMayFit.push(
        "Your reserve is already covered here, so extra cash beyond that earns little.",
      );
    }
  }

  score = clamp(round(score), 0, 100);
  let suitability = suitabilityFromScore(score);

  // Financial priorities outrank stated risk tolerance.
  if (
    blocking &&
    (meta.riskLevel === "high" || meta.group === "equity" || meta.group === "property")
  ) {
    suitability = capSuitability(suitability, "limited_fit");
    whyItMayNotFit.push(
      "Basic priorities in your plan come first, so growth categories are held back for now.",
    );
  }
  if (meta.key === "direct_stocks" && analysis.beginnerMode) {
    suitability = capSuitability(suitability, "limited_fit");
  }
  if (meta.key === "direct_real_estate" && capacity.oneTime < minimumCapital) {
    suitability = "not_suitable";
  }

  return {
    key: meta.key,
    label: meta.label,
    group: meta.group,
    suitability,
    suitabilityLabel: SUITABILITY_LABELS[suitability],
    score,
    role: meta.role,
    riskLevel: meta.riskLevel,
    liquidity: meta.liquidity,
    horizon: meta.horizon,
    horizonLabel: HORIZON_LABELS[meta.horizon],
    minimumCapitalNote:
      minimumCapital > 0
        ? `Usually practical from about ${args.formatMoney(minimumCapital)} of investable capital.`
        : "No meaningful minimum amount.",
    volatilityNote: meta.volatilityNote,
    diversificationValue: meta.diversificationValue,
    whyItMayFit,
    whyItMayNotFit,
    suggestedSharePercent: null,
    suggestedRangePercent: null,
    suggestedOneTimeAmount: null,
    suggestedMonthlyAmount: null,
    explanation: generateRecommendationExplanation(meta, {
      suitability,
      whyItMayFit,
      whyItMayNotFit,
      sharePercent: null,
      formatMoney: args.formatMoney,
      oneTimeAmount: null,
      monthlyAmount: null,
    }),
    beginnerNote: meta.beginnerNote,
  };
}

/* ------------------------------------------------- allocation framework */

/**
 * Turns the band weights into an illustrative framework, dropping classes the
 * person's situation does not support and renormalising the rest to 100%.
 */
export function generateAllocationFramework(
  results: AssetClassResult[],
  band: RiskBand,
  capacity: InvestmentCapacity,
): AllocationFrameworkRow[] {
  const weights = BAND_WEIGHTS[band];
  const eligible = results.filter(
    (result) =>
      weights[result.key] !== undefined &&
      (result.suitability === "strong_fit" || result.suitability === "potential_fit"),
  );

  const pool = eligible.length
    ? eligible
    : results.filter((result) => result.key === "cash_liquid" || result.key === "fixed_deposits");

  const rawTotal = pool.reduce((total, result) => total + (weights[result.key] ?? 10), 0);
  if (rawTotal === 0) return [];

  const rows = pool.map((result) => {
    const percent = round(((weights[result.key] ?? 10) / rawTotal) * 100);
    return {
      key: result.key,
      label: result.label,
      role: result.role,
      percent,
      rangePercent: [Math.max(percent - 5, 0), Math.min(percent + 5, 100)] as [number, number],
      oneTimeAmount: round((capacity.oneTime * percent) / 100),
      monthlyAmount: round((capacity.monthly * percent) / 100),
    };
  });

  // Push any rounding difference onto the largest row so shares total 100%.
  const drift = 100 - rows.reduce((total, row) => total + row.percent, 0);
  if (drift !== 0 && rows.length) {
    const largest = rows.reduce((best, row) => (row.percent > best.percent ? row : best), rows[0]!);
    largest.percent = round(largest.percent + drift);
    largest.rangePercent = [Math.max(largest.percent - 5, 0), Math.min(largest.percent + 5, 100)];
  }

  return rows.sort((a, b) => b.percent - a.percent);
}

/* ------------------------------------------------------- gap analysis */

export function generatePortfolioGapAnalysis(
  analysis: PlannerAnalysis,
  capacity: InvestmentCapacity,
  risk: RiskAssessment,
): PortfolioGap[] {
  const gaps: PortfolioGap[] = [];
  const kinds = analysis.investments.kinds;

  if (analysis.emergencyFund.gap > 0) {
    gaps.push({
      key: "reserve",
      title: "Your reserve is below your own target",
      severity: analysis.emergencyFund.coverageMonths < 1 ? "high" : "medium",
      explanation: `You have set aside about ${analysis.emergencyFund.coverageMonths} month(s) of essential expenses against your ${analysis.emergencyFund.targetMonths}-month target.`,
      suggestion:
        "Directing new money to reachable savings first usually matters more than choosing between investment categories.",
    });
  }

  if (analysis.investments.totalValue > 0 && kinds.length === 1) {
    gaps.push({
      key: "concentration",
      title: "Your investments sit in a single category",
      severity: "medium",
      explanation:
        "A large portion of what you have invested is in one asset category, so its ups and downs move your whole portfolio together.",
      suggestion:
        "Rather than selling anything now, new contributions can go to a different category until the balance looks more even.",
    });
  } else if (
    analysis.investments.totalValue > 0 &&
    kinds.length < OPPORTUNITY_RULES.minimumHoldingKinds
  ) {
    gaps.push({
      key: "diversification",
      title: "Diversification is still thin",
      severity: "low",
      explanation: `You hold ${kinds.length} investment categories. Your goals stretch across different time frames, so spreading money more widely usually reduces how much any one thing matters.`,
      suggestion:
        "Adding one steadier category alongside what you hold is usually enough to start with.",
    });
  }

  if (analysis.goalsMonthlyRequirement > Math.max(analysis.monthlySurplus, 0)) {
    gaps.push({
      key: "goal_mismatch",
      title: "Your goals need more each month than you have spare",
      severity: "high",
      explanation: `Your goals imply about ${analysis.goalsMonthlyRequirement} a month while your surplus is ${analysis.monthlySurplus}.`,
      suggestion:
        "Either the amounts, the dates or the monthly surplus needs to move. The what-if page shows the effect of each.",
    });
  }

  if (capacity.shortTermGoalComponent > capacity.availableCapital) {
    gaps.push({
      key: "liquidity_mismatch",
      title: "Money needed soon exceeds what is reachable",
      severity: "high",
      explanation:
        "The amount your near-term goals still need is larger than the savings you can reach quickly, so investing a lump sum now could leave you short.",
      suggestion:
        "Keep near-term money in reachable savings and invest only what is left after that.",
    });
  }

  if (risk.cappedByPriorities) {
    gaps.push({
      key: "risk_mismatch",
      title: "Your comfort with risk is ahead of your foundations",
      severity: "medium",
      explanation:
        "Your answers suggest you could accept more movement in value, but your reserve, debt or cash flow is not yet in a position to support it.",
      suggestion:
        "The band lifts on its own once those basics are in place; nothing needs to be forced now.",
    });
  }

  if (
    analysis.investments.totalValue > 0 &&
    capacity.liquidReserve > analysis.accessibleSavings &&
    analysis.investments.totalValue > analysis.accessibleSavings
  ) {
    gaps.push({
      key: "over_invested",
      title: "More is invested than kept reachable",
      severity: "medium",
      explanation:
        "Your invested amount is larger than your reachable savings while your reserve target is not met, so a surprise expense could force a sale at a bad moment.",
      suggestion:
        "Pausing new contributions and building reachable savings for a while usually fixes this without selling anything.",
    });
  }

  return gaps;
}

/* ------------------------------------------------------------- equity */

function equityLadder(beginner: boolean) {
  return [
    {
      key: "index",
      label: "Broad-market or index exposure",
      description:
        "One holding that follows a whole market. The simplest way to own many companies at once, and usually where beginners start.",
      emphasis: "start_here" as const,
    },
    {
      key: "funds",
      label: "Diversified equity funds",
      description:
        "A managed basket of company shares. Still spread across many companies, with someone choosing the holdings and charging for it.",
      emphasis: beginner ? ("next" as const) : ("start_here" as const),
    },
    {
      key: "direct",
      label: "Individual company shares",
      description:
        "Buying companies one at a time. This needs research per company and a rule for how much of your money any single company may represent.",
      emphasis: "advanced" as const,
    },
  ];
}

/* ------------------------------------------------------- full report */

export function buildOpportunityReport(
  input: PlannerInput,
  analysis: PlannerAnalysis,
  options: {
    /** Candidate research list produced by the market-data layer. */
    equityCandidates?: EquityResearchItem[];
    market: MarketDataMeta;
  },
): OpportunityReport {
  const formatMoney = (value: number) => {
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

  const risk = calculateRiskProfile(input, analysis);
  const capacity = calculateInvestmentCapacity(analysis);

  const blockingCodes = ["A", "B", "C"];
  const blocking = blockingCodes.includes(analysis.primaryAction.code);
  const blockingSteps = analysis.priorities
    .filter((priority) => blockingCodes.includes(priority.code))
    .map((priority) => priority.title);

  const beforeInvesting = {
    blocking,
    heading: blocking ? "Before investing" : "Your foundations are in place",
    steps: blocking
      ? [...blockingSteps, "Then consider longer-term investments"]
      : ["Reserve covered", "No high-cost debt outstanding", "Money left over each month"],
    explanation: blocking
      ? "Your comfort with risk does not change the order of these steps. Investing while these are unresolved usually means selling at the wrong time or paying more in interest than investing is likely to add."
      : "Nothing in your plan currently outranks investing, so the categories below are judged on your situation, goals and time frames.",
  };

  const results = ASSET_UNIVERSE.map((meta) =>
    evaluateAssetClassSuitability(meta, { risk, capacity, analysis, blocking, formatMoney }),
  );

  const framework = generateAllocationFramework(results, risk.band, capacity);

  // Fold the framework shares back into each asset result and its explanation.
  for (const result of results) {
    const row = framework.find((entry) => entry.key === result.key);
    if (!row) continue;
    result.suggestedSharePercent = row.percent;
    result.suggestedRangePercent = row.rangePercent;
    result.suggestedOneTimeAmount = row.oneTimeAmount;
    result.suggestedMonthlyAmount = row.monthlyAmount;
    const meta = ASSET_UNIVERSE.find((entry) => entry.key === result.key)!;
    result.explanation = generateRecommendationExplanation(meta, {
      suitability: result.suitability,
      whyItMayFit: result.whyItMayFit,
      whyItMayNotFit: result.whyItMayNotFit,
      sharePercent: row.percent,
      formatMoney,
      oneTimeAmount: row.oneTimeAmount,
      monthlyAmount: row.monthlyAmount,
    });
  }

  const equityResults = results.filter((result) => result.group === "equity");
  const equityAppropriate =
    !blocking &&
    equityResults.some(
      (result) => result.suitability === "strong_fit" || result.suitability === "potential_fit",
    );

  const directStocks = results.find((result) => result.key === "direct_stocks");
  const includeResearchList =
    equityAppropriate &&
    directStocks !== undefined &&
    directStocks.suitability !== "not_suitable" &&
    !analysis.beginnerMode;

  const equity: EquityOpportunities = {
    appropriate: equityAppropriate,
    reason: equityAppropriate
      ? "Your reserve, cash flow and time frames currently support some exposure to company shares, held for years rather than months."
      : blocking
        ? "Company shares are held back until the earlier steps in your plan are dealt with. This is about sequence, not about your answers."
        : "Your situation does not currently point to company shares — your goals are close, your reserve is thin, or there is nothing spare to commit for years.",
    ladder: equityLadder(analysis.beginnerMode),
    researchList: includeResearchList ? (options.equityCandidates ?? []) : [],
    researchNote: includeResearchList
      ? "These appear on your research list because their recorded characteristics match some of the criteria drawn from your profile. This is not a guarantee that any of them will rise, and it is a starting point for your own research rather than a recommendation to buy."
      : analysis.beginnerMode
        ? "Individual company research is not shown while you are getting started. Diversified holdings come first; the list appears once you have some experience recorded."
        : "A company research list appears once individual shares fit your situation.",
  };

  const lowCapital =
    capacity.monthly <= 0 ||
    capacity.monthly < analysis.totalIncome * OPPORTUNITY_RULES.lowCapitalIncomeShare ||
    capacity.oneTime < analysis.totalIncome;

  const lowCapitalMode = {
    active: lowCapital,
    heading: "Starting small is normal",
    focus: [
      "Build a reachable reserve, even a small one",
      "Make saving a habit before making it large",
      "Understand what you are buying before buying it",
      "Start with one simple diversified holding where it fits",
      "Avoid complexity and anything you cannot explain",
    ],
    explanation:
      capacity.monthly <= 0
        ? "There is nothing spare to invest at the moment, so your priority is monthly cash flow rather than choosing investments. That is a normal place to start."
        : "Your current priority may be building financial stability rather than maximising investment returns. A small, regular amount into something simple is enough at this stage — you do not need a large portfolio.",
  };

  const assumptions = [
    `Risk band is calculated from ${risk.factors.length} inputs, not from a single question.`,
    "Minimum practical amounts are expressed as multiples of your own monthly income so they work in any currency.",
    `Money needed within ${PLANNER_RULES.shortTermGoalMonths} months is treated as near-term and kept reachable.`,
    `Any emergency-fund shortfall is planned for over about ${OPPORTUNITY_RULES.emergencyGapSpreadMonths} months.`,
    "Percentages are illustrative planning ranges, not guaranteed or universally appropriate allocations.",
    "No rate of return is assumed anywhere in this analysis.",
  ];

  return {
    currency: input.currency,
    risk,
    capacity,
    beforeInvesting,
    assetClasses: results.sort((a, b) => b.score - a.score),
    framework,
    gaps: generatePortfolioGapAnalysis(analysis, capacity, risk),
    equity,
    lowCapitalMode,
    market: options.market,
    assumptions,
  };
}
