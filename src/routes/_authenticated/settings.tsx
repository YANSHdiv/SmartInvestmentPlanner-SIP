import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { toUserMessage } from "@/lib/errors";

import {
  AmountGrid,
  DebtEditor,
  EXPENSE_CATEGORIES,
  INCOME_KINDS,
  InvestmentEditor,
  SAVING_KINDS,
  TotalRow,
  sumMap,
  toExpenseRows,
  toIncomeRows,
  toSavingRows,
  type AmountMap,
  type DebtRow,
  type InvestmentRow,
} from "@/components/finance/LedgerEditors";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState, LoadingState } from "@/components/states";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getFinancialSnapshot,
  replaceLedger,
  updateFinancialProfile,
  updateProfile,
} from "@/lib/api/finance.functions";
import { SUPPORTED_CURRENCIES } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "My details — Smart Investment Planner" },
      {
        name: "description",
        content: "Update your income, spending, savings, debt, investments and plan assumptions.",
      },
      { property: "og:title", content: "My details — Smart Investment Planner" },
      {
        property: "og:description",
        content: "Keep your numbers current so your plan stays useful.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const snapshotQuery = useQuery({ queryKey: ["snapshot"], queryFn: () => getFinancialSnapshot() });

  const [displayName, setDisplayName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [emergencyMonths, setEmergencyMonths] = useState(6);
  const [incomes, setIncomes] = useState<AmountMap>({});
  const [expenses, setExpenses] = useState<AmountMap>({});
  const [savings, setSavings] = useState<AmountMap>({});
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [investments, setInvestments] = useState<InvestmentRow[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const data = snapshotQuery.data;
    if (!data || hydrated) return;
    setHydrated(true);
    setDisplayName(data.profile?.display_name ?? "");
    setCurrency(data.profile?.currency ?? "INR");
    setEmergencyMonths(Number(data.financialProfile?.emergency_months_target ?? 6));
    setIncomes(
      Object.fromEntries(data.incomes.map((row) => [row.kind, Number(row.monthly_amount)])),
    );
    setExpenses(
      Object.fromEntries(data.expenses.map((row) => [row.category, Number(row.monthly_amount)])),
    );
    setSavings(Object.fromEntries(data.savings.map((row) => [row.kind, Number(row.amount)])));
    setDebts(
      data.debts.map((row) => ({
        kind: row.kind,
        outstanding_amount: Number(row.outstanding_amount),
        monthly_payment: Number(row.monthly_payment),
        interest_rate: Number(row.interest_rate),
      })),
    );
    setInvestments(
      data.investments.map((row) => ({
        kind: row.kind,
        current_value: Number(row.current_value),
        monthly_contribution: Number(row.monthly_contribution),
      })),
    );
  }, [snapshotQuery.data, hydrated]);

  const save = useMutation({
    mutationFn: async () => {
      await updateProfile({
        data: { ...(displayName.trim() ? { display_name: displayName.trim() } : {}), currency },
      });
      await updateFinancialProfile({
        data: {
          emergency_months_target: emergencyMonths,
          has_debt: debts.some((row) => row.outstanding_amount > 0),
        },
      });
      await replaceLedger({
        data: {
          incomes: toIncomeRows(incomes),
          expenses: toExpenseRows(expenses),
          savings: toSavingRows(savings),
          debts: debts.filter((row) => row.outstanding_amount > 0),
          investments: investments.filter(
            (row) => row.current_value > 0 || row.monthly_contribution > 0,
          ),
        },
      });
    },
    onSuccess: () => {
      toast.success("Saved. Your plan has been recalculated.");
      void queryClient.invalidateQueries();
    },
    onError: (error) => toast.error(toUserMessage(error)),
  });

  if (snapshotQuery.isLoading) {
    return (
      <AppShell title="My details">
        <LoadingState />
      </AppShell>
    );
  }
  if (snapshotQuery.isError) {
    return (
      <AppShell title="My details">
        <ErrorState
          description={toUserMessage(snapshotQuery.error)}
          onRetry={() => void snapshotQuery.refetch()}
        />
      </AppShell>
    );
  }

  const totalIncome = sumMap(incomes);
  const totalExpenses = sumMap(expenses);

  return (
    <AppShell
      title="My details"
      subtitle="Change anything here and your plan updates straight away."
      actions={
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expenses">Spending</TabsTrigger>
          <TabsTrigger value="savings">Savings</TabsTrigger>
          <TabsTrigger value="debt">Debt</TabsTrigger>
          <TabsTrigger value="investments">Investments</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="panel mt-4 space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="display-name">Your name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      {item.symbol} {item.code} — {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergency-months">Emergency fund target (months of expenses)</Label>
              <Input
                id="emergency-months"
                type="number"
                min={1}
                max={24}
                value={emergencyMonths}
                onChange={(event) =>
                  setEmergencyMonths(Math.min(24, Math.max(1, Number(event.target.value) || 1)))
                }
              />
              <p className="text-xs text-muted-foreground">
                There is no universal target. Many people choose between three and six months; less
                predictable income usually means more.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="income" className="panel mt-4 space-y-5 p-5">
          <AmountGrid
            items={INCOME_KINDS}
            value={incomes}
            onChange={setIncomes}
            currency={currency}
            idPrefix="s-income"
          />
          <TotalRow label="Total monthly income" amount={totalIncome} currency={currency} />
        </TabsContent>

        <TabsContent value="expenses" className="panel mt-4 space-y-5 p-5">
          <AmountGrid
            items={EXPENSE_CATEGORIES}
            value={expenses}
            onChange={setExpenses}
            currency={currency}
            idPrefix="s-expense"
          />
          <TotalRow label="Total monthly expenses" amount={totalExpenses} currency={currency} />
          <TotalRow
            label="Left over each month"
            amount={totalIncome - totalExpenses}
            currency={currency}
            tone={totalIncome - totalExpenses >= 0 ? "positive" : "negative"}
          />
        </TabsContent>

        <TabsContent value="savings" className="panel mt-4 space-y-5 p-5">
          <AmountGrid
            items={SAVING_KINDS}
            value={savings}
            onChange={setSavings}
            currency={currency}
            idPrefix="s-saving"
          />
          <TotalRow label="Total accessible savings" amount={sumMap(savings)} currency={currency} />
        </TabsContent>

        <TabsContent value="debt" className="panel mt-4 space-y-5 p-5">
          <DebtEditor rows={debts} onChange={setDebts} currency={currency} />
        </TabsContent>

        <TabsContent value="investments" className="panel mt-4 space-y-5 p-5">
          <InvestmentEditor rows={investments} onChange={setInvestments} currency={currency} />
        </TabsContent>
      </Tabs>

      <div className="mt-5">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </AppShell>
  );
}
