import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analysePlan } from "@/lib/planner/engine";
import { buildOpportunityReport } from "@/lib/planner/assetEngine";
import type { OpportunityReport } from "@/lib/planner/assetTypes";
import { loadSnapshotRows, toPlannerInput } from "./finance.functions";

/**
 * Produces the structured "Where should I invest?" report.
 *
 * The deterministic engines do all of the reasoning; this function only reads
 * stored rows, asks the market-data layer for company characteristics and
 * returns structured JSON.
 */
export const getOpportunityReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OpportunityReport> => {
    const snapshot = await loadSnapshotRows(
      context.supabase,
      context.userId,
      "building your investment options",
    );

    const input = toPlannerInput(snapshot);
    const analysis = analysePlan(input);

    // Market data lives behind its own service layer, loaded server-side only.
    const { getMarketDataProvider, describeMarketData } = await import("@/lib/market/provider");
    const { buildScreenCriteria, screenCompanies } = await import("@/lib/market/screener");

    const provider = getMarketDataProvider();
    const market = describeMarketData(provider);

    const openGoalMonths = analysis.goals
      .filter((goal) => !goal.isFunded && goal.monthsRemaining !== null)
      .map((goal) => goal.monthsRemaining ?? 0);
    const horizonMonths = openGoalMonths.length ? Math.max(...openGoalMonths) : 60;

    const preliminary = buildOpportunityReport(input, analysis, { market });
    const criteria = buildScreenCriteria(preliminary.risk.band, horizonMonths);
    const equityCandidates = screenCompanies(await provider.listCompanies(), criteria);

    return buildOpportunityReport(input, analysis, { market, equityCandidates });
  });
