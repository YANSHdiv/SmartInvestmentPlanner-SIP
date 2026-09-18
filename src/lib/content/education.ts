export type EducationSection = "basics" | "types" | "guides";

export interface EducationArticle {
  slug: string;
  title: string;
  section: EducationSection;
  summary: string;
  complexity: "lower" | "moderate" | "higher";
  readMinutes: number;
  startHere: boolean;
  whatItIs: string;
  example: string;
  whyPeopleUse: string;
  risks: string[];
  considerations: string[];
}

export const EDUCATION_SECTIONS: { key: EducationSection; title: string; description: string }[] = [
  {
    key: "basics",
    title: "Investing basics",
    description: "The handful of ideas everything else builds on.",
  },
  {
    key: "types",
    title: "Investment types",
    description: "What each common option actually is, in plain language.",
  },
  {
    key: "guides",
    title: "Beginner guides",
    description: "Practical answers to the questions people ask first.",
  },
];

export const EDUCATION_ARTICLES: EducationArticle[] = [
  {
    slug: "saving-vs-investing",
    title: "Saving vs investing",
    section: "basics",
    summary: "Two different jobs for your money — and why you usually need both.",
    complexity: "lower",
    readMinutes: 3,
    startHere: true,
    whatItIs:
      "Saving means keeping money somewhere stable and easy to reach. Investing means putting money into assets whose value can rise or fall, in the hope of growing it over longer periods.",
    example:
      "Money for next month's rent belongs in savings. Money you will not touch for eight years is the kind people typically invest.",
    whyPeopleUse:
      "Savings protect you from surprises. Investing is how people try to keep ahead of rising prices over many years.",
    risks: [
      "Saving everything can mean your money loses purchasing power over long periods.",
      "Investing money you need soon can force you to sell at a bad moment.",
    ],
    considerations: [
      "Decide the job of each pot of money before choosing where it goes.",
      "The shorter the time until you need it, the more stable the place should be.",
    ],
  },
  {
    slug: "emergency-fund",
    title: "What an emergency fund is",
    section: "basics",
    summary: "The buffer that keeps a bad month from becoming a bad year.",
    complexity: "lower",
    readMinutes: 3,
    startHere: true,
    whatItIs:
      "An emergency fund is money kept accessible for unexpected expenses or income disruptions — repairs, medical costs, or a gap between jobs.",
    example:
      "If your essential expenses are 20,000 a month and you keep 30,000 accessible, you have roughly 1.5 months of coverage.",
    whyPeopleUse:
      "It means an unexpected bill does not have to become expensive debt or a forced sale of investments.",
    risks: [
      "Holding it somewhere hard to access defeats the purpose.",
      "Very large reserves may sit idle for years and lose purchasing power.",
    ],
    considerations: [
      "Coverage is usually measured in months of essential expenses, not total expenses.",
      "Target sizes are conventions, not rules. This app lets you set your own.",
    ],
  },
  {
    slug: "risk",
    title: "Risk, in plain language",
    section: "basics",
    summary: "Risk is not just 'losing money' — it is how much values move around.",
    complexity: "lower",
    readMinutes: 4,
    startHere: true,
    whatItIs:
      "In investing, risk usually describes how much and how often the value of something fluctuates, and the chance it is worth less than you paid when you need it.",
    example:
      "A fixed deposit's value barely moves. A share can rise 20% one year and fall 25% the next, even if the company is fine.",
    whyPeopleUse:
      "People accept fluctuation because assets that move more have historically been the ones with more long-term growth potential — with no guarantee that continues.",
    risks: [
      "Higher potential growth always comes with a real possibility of loss.",
      "Reacting emotionally to a fall is what turns a temporary dip into a permanent loss.",
    ],
    considerations: [
      "Match risk to how soon you need the money, not to how confident you feel today.",
      "A questionnaire result is an educational description, not a professional suitability assessment.",
    ],
  },
  {
    slug: "diversification",
    title: "Diversification",
    section: "basics",
    summary: "Not relying on any single thing going well.",
    complexity: "lower",
    readMinutes: 3,
    startHere: true,
    whatItIs:
      "Diversification means spreading money across different investments and types of investment, so one disappointing outcome does not decide everything.",
    example:
      "Holding one company's shares means your result is that company's result. Holding a broad fund spreads it across many companies.",
    whyPeopleUse: "It reduces the impact of any single holding behaving badly.",
    risks: [
      "Diversification reduces concentration risk; it does not remove market-wide falls.",
      "Owning many similar funds can feel diversified while holding much the same thing.",
    ],
    considerations: [
      "Look at what you actually hold, not how many accounts you have.",
      "Simplicity and diversification are not opposites — one broad fund can be both.",
    ],
  },
  {
    slug: "inflation",
    title: "Inflation",
    section: "basics",
    summary: "Why money sitting still slowly buys less.",
    complexity: "lower",
    readMinutes: 3,
    startHere: true,
    whatItIs:
      "Inflation is the gradual rise in prices, which reduces what a fixed amount of money can buy.",
    example:
      "If prices rise around 6% in a year, something that cost 100 now costs about 106 — the same 100 buys less.",
    whyPeopleUse:
      "Understanding inflation explains why people invest at all rather than keeping every rupee, dollar or euro in cash.",
    risks: [
      "Cash held for many years can quietly lose purchasing power.",
      "Chasing high returns purely to beat inflation can lead to taking on risk you did not intend.",
    ],
    considerations: [
      "Compare growth to price rises, not just to zero.",
      "Short-term money is still usually best kept stable, inflation or not.",
    ],
  },
  {
    slug: "compounding",
    title: "Compounding",
    section: "basics",
    summary: "Returns that go on to earn returns of their own.",
    complexity: "lower",
    readMinutes: 3,
    startHere: true,
    whatItIs:
      "Compounding is what happens when the returns you earn stay invested and start generating returns themselves.",
    example:
      "Contributing a steady amount every month for ten years generally produces a different outcome than contributing the same total in the final year — because earlier money had longer to grow.",
    whyPeopleUse:
      "It rewards starting early and staying consistent more than picking the perfect moment.",
    risks: [
      "Compounding is not a guarantee of positive returns — losses compound too.",
      "Illustrations that assume a fixed yearly return are simplifications, never forecasts.",
    ],
    considerations: [
      "Time invested usually matters more than the size of the first contribution.",
      "Withdrawing frequently interrupts the effect.",
    ],
  },
  {
    slug: "savings-accounts",
    title: "Savings accounts",
    section: "types",
    summary: "The most accessible place to keep money.",
    complexity: "lower",
    readMinutes: 2,
    startHere: false,
    whatItIs:
      "A bank account where money stays available on demand and earns a small amount of interest.",
    example:
      "Keeping your emergency reserve in a separate savings account you do not use for daily spending.",
    whyPeopleUse: "Immediate access and very little fluctuation in value.",
    risks: ["Interest is typically low and may not keep pace with rising prices."],
    considerations: [
      "Ideal for emergency reserves and money needed within a year.",
      "Keeping it separate from your spending account makes it less tempting.",
    ],
  },
  {
    slug: "fixed-deposits",
    title: "Fixed deposits",
    section: "types",
    summary: "A set amount, for a set period, at a set rate.",
    complexity: "lower",
    readMinutes: 2,
    startHere: true,
    whatItIs: "Money placed with a bank for a fixed period at an agreed interest rate.",
    example: "Placing money for 12 months for a purchase you have already scheduled.",
    whyPeopleUse: "Predictability — you generally know what you will receive at the end.",
    risks: [
      "Withdrawing early usually reduces the interest you receive.",
      "Returns may trail inflation over long periods.",
    ],
    considerations: [
      "Match the term to when you actually need the money.",
      "Interest may be taxable.",
    ],
  },
  {
    slug: "bonds",
    title: "Bonds and fixed income",
    section: "types",
    summary: "Lending money in exchange for interest.",
    complexity: "moderate",
    readMinutes: 3,
    startHere: false,
    whatItIs:
      "A bond is a loan you make to a government or company, which pays interest and repays the amount at the end.",
    example: "A government bond paying interest twice a year until it matures.",
    whyPeopleUse: "Often steadier than shares, and used to balance a portfolio.",
    risks: [
      "The issuer could fail to pay (credit risk).",
      "Bond prices move when interest rates change.",
    ],
    considerations: [
      "Who the borrower is matters as much as the rate.",
      "Most beginners access bonds through funds.",
    ],
  },
  {
    slug: "mutual-funds",
    title: "Mutual funds",
    section: "types",
    summary: "Many people's money, managed together in one basket.",
    complexity: "moderate",
    readMinutes: 3,
    startHere: true,
    whatItIs:
      "A mutual fund pools money from many investors and buys a basket of investments according to a stated mandate.",
    example:
      "A fund that holds shares in a few hundred companies, so one contribution spreads across all of them.",
    whyPeopleUse:
      "Instant diversification, small minimum amounts, and no need to pick individual holdings.",
    risks: [
      "Values fluctuate with the underlying holdings.",
      "Costs reduce your result, and higher costs are not repaid by better outcomes.",
    ],
    considerations: [
      "Read what the fund actually invests in before its past performance.",
      "Compare ongoing charges between similar funds.",
    ],
  },
  {
    slug: "index-funds",
    title: "Index funds",
    section: "types",
    summary: "Funds that track a market instead of trying to beat it.",
    complexity: "moderate",
    readMinutes: 3,
    startHere: true,
    whatItIs:
      "An index fund holds the constituents of a market index, aiming to match it rather than outperform it.",
    example:
      "A fund tracking a broad national index holds those companies in roughly their index weights.",
    whyPeopleUse: "Broad exposure, usually at lower cost, with rules that are easy to understand.",
    risks: [
      "You get the market's falls as well as its rises.",
      "A narrow index can be far less diversified than it sounds.",
    ],
    considerations: [
      "Check which index is tracked.",
      "Costs and tracking differences still vary between providers.",
    ],
  },
  {
    slug: "stocks",
    title: "Stocks",
    section: "types",
    summary: "Owning a small slice of individual companies.",
    complexity: "higher",
    readMinutes: 3,
    startHere: true,
    whatItIs:
      "A stock (or share) is part-ownership of a company, giving you a claim on its future fortunes.",
    example:
      "Buying shares in one company ties part of your money to that single company's results.",
    whyPeopleUse: "The possibility of long-term growth and, for some companies, dividends.",
    risks: [
      "Individual companies can lose most or all of their value.",
      "Prices can fall for years even when nothing is obviously wrong.",
    ],
    considerations: [
      "Concentration in a few names is a common beginner mistake.",
      "Many people access shares through funds first.",
    ],
  },
  {
    slug: "gold",
    title: "Gold",
    section: "types",
    summary: "A long-standing diversifier, not an income source.",
    complexity: "moderate",
    readMinutes: 2,
    startHere: false,
    whatItIs:
      "Gold is a commodity held in physical or paper form, often used to diversify a portfolio.",
    example: "Holding a modest share of a portfolio in gold alongside funds and deposits.",
    whyPeopleUse:
      "Its price often behaves differently from shares, which can smooth overall movement.",
    risks: [
      "Prices can be volatile.",
      "It pays no interest or dividend, and physical gold has storage costs.",
    ],
    considerations: [
      "Usually a small share of a plan rather than its core.",
      "Form matters: physical, fund or digital.",
    ],
  },
  {
    slug: "long-term-savings-schemes",
    title: "Long-term savings schemes",
    section: "types",
    summary: "Low-fluctuation savings with restricted access.",
    complexity: "lower",
    readMinutes: 2,
    startHere: false,
    whatItIs:
      "Government-backed or employer-linked schemes designed for long horizons, typically with limits on withdrawals.",
    example:
      "Contributing a fixed amount every year to a scheme intended to be held for many years.",
    whyPeopleUse: "Steady accumulation, often with tax advantages depending on where you live.",
    risks: ["Money is locked in for long periods.", "Rules and rates can change over time."],
    considerations: [
      "Never place your emergency reserve in something you cannot access.",
      "Check the withdrawal rules before contributing.",
    ],
  },
  {
    slug: "how-can-a-student-start",
    title: "How can a student start?",
    section: "guides",
    summary: "Starting with irregular income and a small balance.",
    complexity: "lower",
    readMinutes: 4,
    startHere: false,
    whatItIs:
      "A sequence for beginning when income is small or irregular: know your numbers, keep a small buffer, then invest a modest amount consistently.",
    example:
      "An intern earning 18,000 a month with 12,000 of expenses builds a small buffer first, then starts a regular monthly contribution.",
    whyPeopleUse: "Habits formed on small amounts are what make larger amounts manageable later.",
    risks: [
      "Investing money that is actually needed for fees or rent.",
      "Copying strategies designed for stable, higher incomes.",
    ],
    considerations: [
      "Even a very small buffer is worth having before investing.",
      "Consistency matters more than the amount at this stage.",
    ],
  },
  {
    slug: "first-time-investor-basics",
    title: "What should a first-time investor understand?",
    section: "guides",
    summary: "Five expectations to set before your first contribution.",
    complexity: "lower",
    readMinutes: 4,
    startHere: false,
    whatItIs:
      "A short checklist: know your time horizon, expect fluctuation, keep costs visible, diversify, and avoid decisions driven by headlines.",
    example:
      "Someone starting a monthly contribution decides in advance how they will respond to a 20% fall.",
    whyPeopleUse:
      "Most beginner regrets come from expectations, not from choosing the wrong product.",
    risks: ["Expecting steady yearly gains.", "Stopping contributions during a fall."],
    considerations: [
      "Write down why you chose something, so you can review the reason later.",
      "No one can reliably predict short-term market moves.",
    ],
  },
  {
    slug: "what-is-sip",
    title: "What is SIP?",
    section: "guides",
    summary: "Investing a fixed amount at regular intervals.",
    complexity: "lower",
    readMinutes: 3,
    startHere: false,
    whatItIs:
      "A systematic investment plan means contributing a set amount on a set schedule instead of investing a lump sum at one moment.",
    example:
      "Contributing 2,000 on the fifth of every month, regardless of what prices did that week.",
    whyPeopleUse:
      "It removes timing decisions and spreads your entry across many different price levels.",
    risks: [
      "It does not protect you from losses in a falling market.",
      "Pausing contributions during falls removes much of the benefit.",
    ],
    considerations: [
      "Pick an amount you can sustain through a difficult month.",
      "Automate it so it does not depend on how you feel that week.",
    ],
  },
  {
    slug: "how-much-should-stay-accessible",
    title: "How much money should remain accessible?",
    section: "guides",
    summary: "Deciding what stays liquid and what can be committed.",
    complexity: "lower",
    readMinutes: 3,
    startHere: false,
    whatItIs:
      "A way to split your money by when you need it: near-term spending, an emergency reserve, and long-horizon money.",
    example:
      "Next month's bills stay in your account, a few months of essentials sit in a separate reserve, and the rest can be committed for years.",
    whyPeopleUse: "It prevents being forced to sell long-term holdings at an inconvenient moment.",
    risks: [
      "Too little accessible money leads to borrowing.",
      "Too much sitting idle for years loses purchasing power.",
    ],
    considerations: [
      "Review the split when your income or responsibilities change.",
      "Coverage targets are conventions you can adjust.",
    ],
  },
  {
    slug: "why-diversification-matters",
    title: "Why diversification matters",
    section: "guides",
    summary: "What concentration actually costs when it goes wrong.",
    complexity: "moderate",
    readMinutes: 3,
    startHere: false,
    whatItIs:
      "A practical look at how spreading money changes the range of outcomes you can expect.",
    example:
      "Two people invest the same amount: one in a single company, one across a broad fund. Their best and worst cases look very different.",
    whyPeopleUse:
      "Because you cannot know in advance which single choice would have been the good one.",
    risks: ["Diversification does not prevent losses when whole markets fall."],
    considerations: [
      "Check overlap between your holdings.",
      "More accounts is not the same as more diversification.",
    ],
  },
  {
    slug: "why-horizon-matters",
    title: "Why investment horizon matters",
    section: "guides",
    summary: "Time until you need the money shapes every other decision.",
    complexity: "moderate",
    readMinutes: 3,
    startHere: false,
    whatItIs:
      "Your horizon is how long money can stay invested before you need it. It largely determines how much fluctuation is tolerable.",
    example:
      "Money needed in eight months and money needed in fifteen years are rarely suited to the same place.",
    whyPeopleUse: "It converts a vague question about risk into a concrete one about dates.",
    risks: [
      "Treating an approaching goal as if it were long-term.",
      "Assuming a long horizon guarantees a positive result.",
    ],
    considerations: [
      "Attach a date to every goal so horizon is explicit.",
      "Shorten risk as a goal's date approaches.",
    ],
  },
];

export function getArticle(slug: string) {
  return EDUCATION_ARTICLES.find((a) => a.slug === slug);
}

export function startHereArticles() {
  return EDUCATION_ARTICLES.filter((a) => a.startHere);
}

export function articlesBySection(section: EducationSection) {
  return EDUCATION_ARTICLES.filter((a) => a.section === section);
}

/** Suggests learning based on the current primary priority code. */
export function recommendedArticles(priorityCode: string): EducationArticle[] {
  const map: Record<string, string[]> = {
    A: ["saving-vs-investing", "how-much-should-stay-accessible", "emergency-fund"],
    B: ["emergency-fund", "savings-accounts", "how-much-should-stay-accessible"],
    C: ["saving-vs-investing", "risk", "how-much-should-stay-accessible"],
    D: ["how-much-should-stay-accessible", "fixed-deposits", "why-horizon-matters"],
    E: ["what-is-sip", "mutual-funds", "index-funds", "compounding"],
    F: ["diversification", "why-diversification-matters", "risk"],
  };
  return (map[priorityCode] ?? map["E"]!)
    .map((slug) => getArticle(slug))
    .filter((a): a is EducationArticle => Boolean(a));
}
