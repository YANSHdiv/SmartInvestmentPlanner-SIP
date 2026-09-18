/** Plain-language definitions surfaced through the inline term helper. */
export interface GlossaryEntry {
  term: string;
  definition: string;
  /** Slug of the learn article to read next, when one exists. */
  article?: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  "asset allocation": {
    term: "Asset allocation",
    definition: "How money is divided among different types of investments.",
    article: "diversification",
  },
  liquidity: {
    term: "Liquidity",
    definition: "How easily something can be converted into usable money.",
    article: "how-much-should-stay-accessible",
  },
  volatility: {
    term: "Volatility",
    definition: "How much the value of an investment tends to fluctuate.",
    article: "risk",
  },
  diversification: {
    term: "Diversification",
    definition: "Spreading money across different investments rather than relying on one.",
    article: "diversification",
  },
  inflation: {
    term: "Inflation",
    definition: "The gradual rise in prices, which reduces what a fixed amount of money can buy.",
    article: "inflation",
  },
  compounding: {
    term: "Compounding",
    definition: "When returns you earn start earning returns of their own over time.",
    article: "compounding",
  },
  "emergency fund": {
    term: "Emergency fund",
    definition: "Money kept accessible for unexpected expenses or income disruptions.",
    article: "emergency-fund",
  },
  sip: {
    term: "SIP",
    definition:
      "A systematic investment plan — investing a fixed amount at regular intervals instead of all at once.",
    article: "what-is-sip",
  },
  "index fund": {
    term: "Index fund",
    definition: "A fund that simply tracks a market index rather than trying to beat it.",
    article: "index-funds",
  },
  "mutual fund": {
    term: "Mutual fund",
    definition: "A pooled investment where many people's money is managed together in one basket.",
    article: "mutual-funds",
  },
  "risk profile": {
    term: "Risk profile",
    definition:
      "A simplified description of how much fluctuation in value you say you can live with.",
    article: "risk",
  },
  "monthly surplus": {
    term: "Monthly surplus",
    definition: "What is left over each month after subtracting your expenses from your income.",
  },
  "fixed deposit": {
    term: "Fixed deposit",
    definition: "Money placed for a fixed period at a pre-agreed interest rate.",
    article: "fixed-deposits",
  },
  bond: {
    term: "Bond",
    definition: "Lending money to a government or company in exchange for interest payments.",
    article: "bonds",
  },
  "investment horizon": {
    term: "Investment horizon",
    definition: "How long you expect to leave money invested before you need it.",
    article: "why-horizon-matters",
  },
  reit: {
    term: "REIT",
    definition:
      "A listed company that owns rent-producing property. It lets you get property exposure in small amounts and sell it far more easily than a building.",
  },
  "expense ratio": {
    term: "Expense ratio",
    definition:
      "The yearly cost of holding a fund, taken out of the fund's value rather than billed to you.",
  },
  "investment capacity": {
    term: "Investment capacity",
    definition:
      "What you could reasonably consider investing once your reserve, debt payments and near-term goals are covered — not your whole balance.",
  },
  "gold etf": {
    term: "Gold ETF",
    definition:
      "A listed holding that tracks the gold price, so you get gold exposure without storing anything.",
  },
};

export function lookupTerm(key: string): GlossaryEntry | undefined {
  return GLOSSARY[key.toLowerCase()];
}
