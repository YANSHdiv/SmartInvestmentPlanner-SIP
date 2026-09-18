/**
 * Market-data service layer.
 *
 * Deliberately separate from the financial decision engine: prices, fund and
 * company information can be replaced with a live provider without touching a
 * single calculation. When no provider is configured the app falls back to the
 * clearly labelled sample set in `sampleUniverse.ts` — sample figures are never
 * presented as live prices.
 */

import type { MarketDataMeta } from "@/lib/planner/assetTypes";
import { SAMPLE_COMPANIES, SAMPLE_UNIVERSE_UPDATED, type CompanyRecord } from "./sampleUniverse";

export interface MarketDataProvider {
  readonly source: MarketDataMeta["source"];
  readonly name: string;
  listCompanies(): Promise<CompanyRecord[]>;
}

const sampleProvider: MarketDataProvider = {
  source: "sample",
  name: "Built-in sample data set",
  listCompanies: async () => SAMPLE_COMPANIES,
};

/**
 * Resolves the active provider. A live provider is only used when its
 * credentials exist in the server environment; keys never reach the browser.
 */
export function getMarketDataProvider(): MarketDataProvider {
  // No live provider is configured for this deployment. When one is added it is
  // selected here based on a server-side environment variable.
  return sampleProvider;
}

export function describeMarketData(provider: MarketDataProvider): MarketDataMeta {
  const isSample = provider.source === "sample";
  return {
    source: provider.name,
    isLive: !isSample,
    asOf: isSample ? SAMPLE_UNIVERSE_UPDATED : new Date().toISOString(),
    note: isSample
      ? "Company information shown here is a fixed sample data set included with the app for illustration. It is not live market data and the figures are not current prices."
      : `Company information supplied by ${provider.name}.`,
  };
}
