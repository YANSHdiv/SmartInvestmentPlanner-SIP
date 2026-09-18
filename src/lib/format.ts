export const SUPPORTED_CURRENCIES = [
  { code: "INR", label: "Indian Rupee (₹)", symbol: "₹", locale: "en-IN" },
  { code: "USD", label: "US Dollar ($)", symbol: "$", locale: "en-US" },
  { code: "EUR", label: "Euro (€)", symbol: "€", locale: "de-DE" },
  { code: "GBP", label: "Pound Sterling (£)", symbol: "£", locale: "en-GB" },
  { code: "AED", label: "UAE Dirham (AED)", symbol: "AED", locale: "en-AE" },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

export function currencyMeta(code: string) {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code) ?? SUPPORTED_CURRENCIES[0];
}

export function currencySymbol(code: string) {
  return currencyMeta(code).symbol;
}

export function formatMoney(amount: number, code = "INR", options?: { compact?: boolean }) {
  const meta = currencyMeta(code);
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: "currency",
      currency: meta.code,
      maximumFractionDigits: 0,
      notation: options?.compact ? "compact" : "standard",
    }).format(value);
  } catch {
    return `${meta.symbol}${Math.round(value).toLocaleString()}`;
  }
}

export function formatPercent(value: number, dp = 0) {
  return `${(value * 100).toFixed(dp)}%`;
}

export function formatMonths(months: number | null) {
  if (months === null) return "No date set";
  if (months <= 0) return "Due now";
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? `${years} year${years === 1 ? "" : "s"}` : `${years}y ${rest}m`;
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
