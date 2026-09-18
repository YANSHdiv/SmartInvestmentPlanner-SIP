/**
 * Sample company data set.
 *
 * Entirely fictional. The names are generic placeholders and the figures are
 * illustrative characteristics used to demonstrate how the research screen
 * works. Nothing here is a real company, a real price or live market data.
 */

export const SAMPLE_UNIVERSE_UPDATED = "2026-01-01T00:00:00.000Z";

export type SizeBand = "large" | "mid" | "small";

export interface CompanyRecord {
  id: string;
  name: string;
  sector: string;
  sizeBand: SizeBand;
  /** Average yearly revenue growth over the recorded period, as a percentage. */
  revenueGrowthPercent: number;
  /** Operating profit as a share of revenue, as a percentage. */
  profitMarginPercent: number;
  /** Borrowings compared with shareholders' funds. Lower means less borrowed. */
  debtToEquity: number;
  /** Price compared with yearly earnings. Lower can mean cheaper, or troubled. */
  priceToEarnings: number;
  /** How much the share price has moved historically: lower, moderate, higher. */
  priceMovement: "lower" | "moderate" | "higher";
  /** Whether the company has recorded a profit in each period on record. */
  consistentlyProfitable: boolean;
}

export const SAMPLE_COMPANIES: CompanyRecord[] = [
  {
    id: "sample-1",
    name: "Sample Consumer Staples Co.",
    sector: "Everyday consumer goods",
    sizeBand: "large",
    revenueGrowthPercent: 9,
    profitMarginPercent: 14,
    debtToEquity: 0.3,
    priceToEarnings: 28,
    priceMovement: "lower",
    consistentlyProfitable: true,
  },
  {
    id: "sample-2",
    name: "Sample National Bank Ltd.",
    sector: "Banking and finance",
    sizeBand: "large",
    revenueGrowthPercent: 12,
    profitMarginPercent: 22,
    debtToEquity: 0.9,
    priceToEarnings: 18,
    priceMovement: "moderate",
    consistentlyProfitable: true,
  },
  {
    id: "sample-3",
    name: "Sample Software Services Ltd.",
    sector: "Technology services",
    sizeBand: "large",
    revenueGrowthPercent: 15,
    profitMarginPercent: 20,
    debtToEquity: 0.1,
    priceToEarnings: 26,
    priceMovement: "moderate",
    consistentlyProfitable: true,
  },
  {
    id: "sample-4",
    name: "Sample Power Utility Corp.",
    sector: "Utilities",
    sizeBand: "large",
    revenueGrowthPercent: 5,
    profitMarginPercent: 16,
    debtToEquity: 1.4,
    priceToEarnings: 12,
    priceMovement: "lower",
    consistentlyProfitable: true,
  },
  {
    id: "sample-5",
    name: "Sample Healthcare Products Ltd.",
    sector: "Healthcare",
    sizeBand: "mid",
    revenueGrowthPercent: 18,
    profitMarginPercent: 13,
    debtToEquity: 0.4,
    priceToEarnings: 32,
    priceMovement: "moderate",
    consistentlyProfitable: true,
  },
  {
    id: "sample-6",
    name: "Sample Industrial Equipment Ltd.",
    sector: "Industrial manufacturing",
    sizeBand: "mid",
    revenueGrowthPercent: 11,
    profitMarginPercent: 9,
    debtToEquity: 0.8,
    priceToEarnings: 21,
    priceMovement: "higher",
    consistentlyProfitable: true,
  },
  {
    id: "sample-7",
    name: "Sample Speciality Retail Ltd.",
    sector: "Retail",
    sizeBand: "small",
    revenueGrowthPercent: 24,
    profitMarginPercent: 4,
    debtToEquity: 1.9,
    priceToEarnings: 45,
    priceMovement: "higher",
    consistentlyProfitable: false,
  },
  {
    id: "sample-8",
    name: "Sample Renewable Energy Ltd.",
    sector: "Energy transition",
    sizeBand: "small",
    revenueGrowthPercent: 30,
    profitMarginPercent: 6,
    debtToEquity: 2.3,
    priceToEarnings: 52,
    priceMovement: "higher",
    consistentlyProfitable: false,
  },
];
