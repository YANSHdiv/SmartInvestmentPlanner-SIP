/**
 * Company research screen.
 *
 * Turns recorded company characteristics into a research list, using criteria
 * drawn from the person's own risk band and time frame. It never invents names,
 * never ranks by expected return and never claims a share will rise — it only
 * states which recorded characteristics matched and what to be careful about.
 */

import type { EquityResearchItem, RiskBand } from "@/lib/planner/assetTypes";
import type { CompanyRecord } from "./sampleUniverse";

export interface ScreenCriteria {
  /** Minimum recorded average revenue growth. */
  minRevenueGrowthPercent: number;
  /** Minimum recorded operating profit margin. */
  minProfitMarginPercent: number;
  /** Maximum borrowings against shareholders' funds. */
  maxDebtToEquity: number;
  /** Maximum price compared with yearly earnings. */
  maxPriceToEarnings: number;
  /** Company sizes considered. */
  sizeBands: CompanyRecord["sizeBand"][];
  /** Price movement levels considered acceptable. */
  priceMovement: CompanyRecord["priceMovement"][];
  /** Require a profit in every recorded period. */
  requireConsistentProfit: boolean;
  /** Largest number of holdings from any single sector. */
  maxPerSector: number;
}

/** Builds screen criteria from the risk band and how long money can stay invested. */
export function buildScreenCriteria(band: RiskBand, horizonMonths: number): ScreenCriteria {
  const longHorizon = horizonMonths >= 60;
  switch (band) {
    case "aggressive":
      return {
        minRevenueGrowthPercent: 12,
        minProfitMarginPercent: 4,
        maxDebtToEquity: 2.0,
        maxPriceToEarnings: 50,
        sizeBands: ["large", "mid", "small"],
        priceMovement: ["lower", "moderate", "higher"],
        requireConsistentProfit: false,
        maxPerSector: 2,
      };
    case "moderately_aggressive":
      return {
        minRevenueGrowthPercent: 10,
        minProfitMarginPercent: 8,
        maxDebtToEquity: 1.5,
        maxPriceToEarnings: 40,
        sizeBands: longHorizon ? ["large", "mid"] : ["large"],
        priceMovement: ["lower", "moderate", "higher"],
        requireConsistentProfit: true,
        maxPerSector: 2,
      };
    case "moderate":
      return {
        minRevenueGrowthPercent: 8,
        minProfitMarginPercent: 10,
        maxDebtToEquity: 1.0,
        maxPriceToEarnings: 32,
        sizeBands: longHorizon ? ["large", "mid"] : ["large"],
        priceMovement: ["lower", "moderate"],
        requireConsistentProfit: true,
        maxPerSector: 1,
      };
    default:
      return {
        minRevenueGrowthPercent: 5,
        minProfitMarginPercent: 12,
        maxDebtToEquity: 0.6,
        maxPriceToEarnings: 30,
        sizeBands: ["large"],
        priceMovement: ["lower"],
        requireConsistentProfit: true,
        maxPerSector: 1,
      };
  }
}

const valuationBand = (pe: number): EquityResearchItem["valuationBand"] =>
  pe <= 18 ? "lower" : pe <= 30 ? "average" : "higher";

const volatilityBand = (
  movement: CompanyRecord["priceMovement"],
): EquityResearchItem["volatilityBand"] =>
  movement === "lower" ? "lower" : movement === "moderate" ? "average" : "higher";

/** Applies the criteria, keeping sector spread so the list is not concentrated. */
export function screenCompanies(
  companies: CompanyRecord[],
  criteria: ScreenCriteria,
  limit = 5,
): EquityResearchItem[] {
  const matches = companies.filter(
    (company) =>
      company.revenueGrowthPercent >= criteria.minRevenueGrowthPercent &&
      company.profitMarginPercent >= criteria.minProfitMarginPercent &&
      company.debtToEquity <= criteria.maxDebtToEquity &&
      company.priceToEarnings <= criteria.maxPriceToEarnings &&
      criteria.sizeBands.includes(company.sizeBand) &&
      criteria.priceMovement.includes(company.priceMovement) &&
      (!criteria.requireConsistentProfit || company.consistentlyProfitable),
  );

  const perSector = new Map<string, number>();
  const selected: CompanyRecord[] = [];
  for (const company of matches) {
    const used = perSector.get(company.sector) ?? 0;
    if (used >= criteria.maxPerSector) continue;
    perSector.set(company.sector, used + 1);
    selected.push(company);
    if (selected.length >= limit) break;
  }

  return selected.map((company) => {
    const matchReasons: string[] = [
      `Recorded revenue growth of about ${company.revenueGrowthPercent}% a year, at or above the ${criteria.minRevenueGrowthPercent}% level drawn from your profile.`,
      `Operating profit of about ${company.profitMarginPercent}% of revenue.`,
      company.debtToEquity <= 0.5
        ? "Borrows little compared with its own funds."
        : `Borrowings of about ${company.debtToEquity}× its own funds, within the limit used for your profile.`,
    ];
    if (company.consistentlyProfitable)
      matchReasons.push("Recorded a profit in every period on record.");
    matchReasons.push(
      `Adds exposure to ${company.sector.toLowerCase()}, which keeps the list spread across sectors.`,
    );

    const cautions: string[] = [];
    if (valuationBand(company.priceToEarnings) === "higher")
      cautions.push(
        "Its price is high compared with its earnings, so expectations are already built in.",
      );
    if (company.sizeBand !== "large")
      cautions.push("Smaller companies tend to move more sharply in both directions.");
    if (company.debtToEquity > 1)
      cautions.push("It carries meaningful borrowings, which matters more if trading weakens.");
    if (volatilityBand(company.priceMovement) === "higher")
      cautions.push("Its share price has moved a lot historically.");
    if (cautions.length === 0)
      cautions.push(
        "Past characteristics say nothing certain about the future; read the company's own reports before acting.",
      );

    return {
      id: company.id,
      name: company.name,
      sector: company.sector,
      marketCapBand: company.sizeBand,
      revenueGrowthPercent: company.revenueGrowthPercent,
      profitMarginPercent: company.profitMarginPercent,
      debtToEquity: company.debtToEquity,
      valuationBand: valuationBand(company.priceToEarnings),
      volatilityBand: volatilityBand(company.priceMovement),
      matchReasons,
      cautions,
    };
  });
}
