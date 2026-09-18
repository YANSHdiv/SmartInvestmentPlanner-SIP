/**
 * Shared domain types for the Smart Investment Planner decision engine.
 * These types are runtime-free so the engine stays pure and unit-testable.
 */

export type RiskProfile = "conservative" | "moderate" | "higher_risk";

export type InvestmentExperience = "none" | "a_little" | "regular" | "unsure";

export type PriorityCode = "A" | "B" | "C" | "D" | "E" | "F";

export interface IncomeInput {
  id?: string;
  kind: string;
  label?: string | null;
  monthly_amount: number;
}

export interface ExpenseInput {
  id?: string;
  category: string;
  monthly_amount: number;
  is_essential: boolean;
}

export interface SavingInput {
  id?: string;
  kind: string;
  amount: number;
}

export interface DebtInput {
  id?: string;
  kind: string;
  outstanding_amount: number;
  monthly_payment: number;
  interest_rate: number;
}

export interface InvestmentInput {
  id?: string;
  kind: string;
  current_value: number;
  monthly_contribution: number;
}

export interface GoalInput {
  id?: string;
  name: string;
  category?: string;
  target_amount: number;
  current_amount: number;
  target_date?: string | null;
  priority?: number;
  status?: string;
}

export interface PlannerInput {
  currency: string;
  displayName?: string | null;
  riskProfile: RiskProfile;
  investmentExperience: InvestmentExperience;
  emergencyMonthsTarget: number;
  /** Raw questionnaire score (0-12) when recorded, used by the opportunity engine. */
  riskScore?: number | null;
  /** How steady the person's income is, used by the opportunity engine. */
  incomeStability?: "steady" | "varies" | "irregular" | null;
  incomes: IncomeInput[];
  expenses: ExpenseInput[];
  savings: SavingInput[];
  debts: DebtInput[];
  investments: InvestmentInput[];
  goals: GoalInput[];
  /** Reference date used for goal horizon maths. Defaults to today. */
  today?: Date;
}

export interface GoalAnalysis {
  id: string | null;
  name: string;
  category: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  progressPercent: number;
  targetDate: string | null;
  monthsRemaining: number | null;
  monthlyContributionEstimate: number | null;
  horizon: "short" | "medium" | "long" | "unknown";
  priority: number;
  isFunded: boolean;
}

export interface Recommendation {
  code: PriorityCode;
  /** WHAT — the suggested action. */
  title: string;
  /** WHY — which of the user's numbers produced this. */
  why: string;
  /** HOW — a practical step they can consider. */
  how: string;
  /** AFTER THIS — the priority that comes next. */
  afterThis: string;
  /** Suggested monthly amount to direct at this priority, when meaningful. */
  suggestedMonthlyAmount: number | null;
  urgency: "critical" | "high" | "medium" | "low";
}

export interface AllocationSlice {
  key: string;
  label: string;
  percent: number;
  amount: number;
  purpose: string;
  riskNote: string;
  complexity: "lower" | "moderate" | "higher";
}

export interface JourneyStage {
  key: string;
  label: string;
  state: "done" | "current" | "upcoming";
}

export interface PlannerAnalysis {
  currency: string;
  totalIncome: number;
  totalExpenses: number;
  essentialExpenses: number;
  monthlySurplus: number;
  surplusRate: number;
  totalSavings: number;
  accessibleSavings: number;
  emergencyFund: {
    current: number;
    targetMonths: number;
    targetAmount: number;
    coverageMonths: number;
    progressPercent: number;
    gap: number;
  };
  debt: {
    totalOutstanding: number;
    totalMonthlyPayment: number;
    highestInterestRate: number;
    hasExpensiveDebt: boolean;
    expensiveDebtThreshold: number;
    debtToIncomeRatio: number;
  };
  investments: {
    totalValue: number;
    totalMonthlyContribution: number;
    kinds: string[];
    isDiversified: boolean;
  };
  goals: GoalAnalysis[];
  goalsMonthlyRequirement: number;
  riskProfile: RiskProfile;
  investmentExperience: InvestmentExperience;
  beginnerMode: boolean;
  cashFlowHealthy: boolean;
  priorities: Recommendation[];
  primaryAction: Recommendation;
  allocation: AllocationSlice[];
  investableMonthly: number;
  journey: JourneyStage[];
  assumptions: string[];
  warnings: string[];
}
