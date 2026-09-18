import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currencySymbol, formatMoney } from "@/lib/format";

export type AmountMap = Record<string, number>;

export interface DebtRow {
  kind: string;
  outstanding_amount: number;
  monthly_payment: number;
  interest_rate: number;
}

export interface InvestmentRow {
  kind: string;
  current_value: number;
  monthly_contribution: number;
}

export const INCOME_KINDS = [
  { key: "salary", label: "Salary" },
  { key: "internship", label: "Internship or stipend" },
  { key: "freelance", label: "Freelance or part-time" },
  { key: "other", label: "Other income" },
] as const;

export const EXPENSE_CATEGORIES = [
  { key: "rent", label: "Rent or housing", essential: true },
  { key: "food", label: "Food and groceries", essential: true },
  { key: "transportation", label: "Transportation", essential: true },
  { key: "education", label: "Education or fees", essential: true },
  { key: "utilities", label: "Utilities and phone", essential: true },
  { key: "subscriptions", label: "Subscriptions", essential: false },
  { key: "family", label: "Family support", essential: true },
  { key: "shopping", label: "Shopping and going out", essential: false },
  { key: "other", label: "Other spending", essential: false },
] as const;

export const SAVING_KINDS = [
  { key: "bank", label: "Bank or savings account", hint: "Money you can withdraw any time" },
  {
    key: "emergency",
    label: "Set aside for emergencies",
    hint: "Counted towards your emergency fund",
  },
  { key: "other", label: "Other accessible money", hint: "Cash, wallets, short-term deposits" },
] as const;

export const DEBT_KINDS = [
  { key: "education_loan", label: "Education loan" },
  { key: "personal_loan", label: "Personal loan" },
  { key: "vehicle_loan", label: "Vehicle loan" },
  { key: "credit_card", label: "Credit card balance" },
  { key: "other", label: "Other debt" },
] as const;

export const INVESTMENT_KINDS = [
  { key: "mutual_funds", label: "Mutual funds" },
  { key: "stocks", label: "Stocks" },
  { key: "fixed_deposits", label: "Fixed deposits" },
  { key: "bonds", label: "Bonds" },
  { key: "gold", label: "Gold" },
  { key: "ppf", label: "PPF or provident fund" },
  { key: "other", label: "Other investments" },
] as const;

function MoneyInput({
  id,
  value,
  onChange,
  currency,
  label,
  hint,
}: {
  id: string;
  value: number;
  onChange: (next: number) => void;
  currency: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
          {currencySymbol(currency)}
        </span>
        <Input
          id={id}
          type="number"
          min={0}
          step="100"
          inputMode="numeric"
          className="pl-8"
          value={Number.isFinite(value) && value !== 0 ? value : value === 0 ? "" : ""}
          placeholder="0"
          onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
        />
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function AmountGrid({
  items,
  value,
  onChange,
  currency,
  idPrefix,
}: {
  items: readonly { key: string; label: string; hint?: string }[];
  value: AmountMap;
  onChange: (next: AmountMap) => void;
  currency: string;
  idPrefix: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <MoneyInput
          key={item.key}
          id={`${idPrefix}-${item.key}`}
          label={item.label}
          {...(item.hint ? { hint: item.hint } : {})}
          currency={currency}
          value={value[item.key] ?? 0}
          onChange={(next) => onChange({ ...value, [item.key]: next })}
        />
      ))}
    </div>
  );
}

export function TotalRow({
  label,
  amount,
  currency,
  tone,
}: {
  label: string;
  amount: number;
  currency: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="flex items-baseline justify-between rounded-xl border border-border bg-surface/70 px-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      <span
        className={`font-display text-lg font-semibold ${
          tone === "negative" ? "text-destructive" : tone === "positive" ? "text-success" : ""
        }`}
      >
        {formatMoney(amount, currency)}
      </span>
    </div>
  );
}

export function DebtEditor({
  rows,
  onChange,
  currency,
}: {
  rows: DebtRow[];
  onChange: (next: DebtRow[]) => void;
  currency: string;
}) {
  function update(index: number, patch: Partial<DebtRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <fieldset key={index} className="panel space-y-4 p-4">
          <legend className="sr-only">Debt {index + 1}</legend>
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor={`debt-kind-${index}`}>Type of debt</Label>
              <Select value={row.kind} onValueChange={(kind) => update(index, { kind })}>
                <SelectTrigger id={`debt-kind-${index}`}>
                  <SelectValue placeholder="Choose one" />
                </SelectTrigger>
                <SelectContent>
                  {DEBT_KINDS.map((kind) => (
                    <SelectItem key={kind.key} value={kind.key}>
                      {kind.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove debt ${index + 1}`}
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <MoneyInput
              id={`debt-out-${index}`}
              label="Amount still owed"
              currency={currency}
              value={row.outstanding_amount}
              onChange={(outstanding_amount) => update(index, { outstanding_amount })}
            />
            <MoneyInput
              id={`debt-pay-${index}`}
              label="Monthly payment"
              currency={currency}
              value={row.monthly_payment}
              onChange={(monthly_payment) => update(index, { monthly_payment })}
            />
            <div className="space-y-1.5">
              <Label htmlFor={`debt-rate-${index}`}>Interest rate (% a year)</Label>
              <Input
                id={`debt-rate-${index}`}
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={row.interest_rate || ""}
                placeholder="0"
                onChange={(event) =>
                  update(index, {
                    interest_rate: Math.min(100, Math.max(0, Number(event.target.value) || 0)),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">An approximate figure is fine.</p>
            </div>
          </div>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([
            ...rows,
            { kind: "education_loan", outstanding_amount: 0, monthly_payment: 0, interest_rate: 0 },
          ])
        }
      >
        <Plus className="mr-1.5 h-4 w-4" aria-hidden />
        Add a debt
      </Button>
    </div>
  );
}

export function InvestmentEditor({
  rows,
  onChange,
  currency,
}: {
  rows: InvestmentRow[];
  onChange: (next: InvestmentRow[]) => void;
  currency: string;
}) {
  function update(index: number, patch: Partial<InvestmentRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <fieldset key={index} className="panel space-y-4 p-4">
          <legend className="sr-only">Investment {index + 1}</legend>
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor={`inv-kind-${index}`}>What is it?</Label>
              <Select value={row.kind} onValueChange={(kind) => update(index, { kind })}>
                <SelectTrigger id={`inv-kind-${index}`}>
                  <SelectValue placeholder="Choose one" />
                </SelectTrigger>
                <SelectContent>
                  {INVESTMENT_KINDS.map((kind) => (
                    <SelectItem key={kind.key} value={kind.key}>
                      {kind.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove investment ${index + 1}`}
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyInput
              id={`inv-value-${index}`}
              label="Approximate value today"
              currency={currency}
              value={row.current_value}
              onChange={(current_value) => update(index, { current_value })}
            />
            <MoneyInput
              id={`inv-contrib-${index}`}
              label="Amount added each month"
              currency={currency}
              value={row.monthly_contribution}
              onChange={(monthly_contribution) => update(index, { monthly_contribution })}
            />
          </div>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([...rows, { kind: "mutual_funds", current_value: 0, monthly_contribution: 0 }])
        }
      >
        <Plus className="mr-1.5 h-4 w-4" aria-hidden />
        Add an investment
      </Button>
    </div>
  );
}

export function sumMap(map: AmountMap) {
  return Object.values(map).reduce((total, value) => total + (Number(value) || 0), 0);
}

export function toIncomeRows(map: AmountMap) {
  return INCOME_KINDS.filter((kind) => (map[kind.key] ?? 0) > 0).map((kind) => ({
    kind: kind.key,
    label: kind.label,
    monthly_amount: map[kind.key] ?? 0,
  }));
}

export function toExpenseRows(map: AmountMap) {
  return EXPENSE_CATEGORIES.filter((category) => (map[category.key] ?? 0) > 0).map((category) => ({
    category: category.key,
    monthly_amount: map[category.key] ?? 0,
    is_essential: category.essential,
  }));
}

export function toSavingRows(map: AmountMap) {
  return SAVING_KINDS.filter((kind) => (map[kind.key] ?? 0) > 0).map((kind) => ({
    kind: kind.key,
    amount: map[kind.key] ?? 0,
  }));
}
