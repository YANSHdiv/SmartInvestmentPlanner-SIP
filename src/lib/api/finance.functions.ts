import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Database, Tables } from "@/integrations/supabase/types";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertNoDbError } from "@/lib/errors";
import { analysePlan } from "@/lib/planner/engine";
import type { PlannerAnalysis, PlannerInput } from "@/lib/planner/types";

const money = z.number().min(0).max(1_000_000_000);

/** Drops keys whose value is undefined so partial updates satisfy strict types. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function compact<T extends object>(input: T): any {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

const riskProfileSchema = z.enum(["conservative", "moderate", "higher_risk"]);
const experienceSchema = z.enum(["none", "a_little", "regular", "unsure"]);

export interface FinancialSnapshot {
  profile: Tables<"profiles"> | null;
  financialProfile: Tables<"financial_profiles"> | null;
  incomes: Tables<"incomes">[];
  expenses: Tables<"expenses">[];
  savings: Tables<"savings">[];
  debts: Tables<"debts">[];
  investments: Tables<"investments">[];
  goals: Tables<"goals">[];
}

/* ------------------------------------------------------------------ reads */

type AuthedClient = SupabaseClient<Database>;

/**
 * Loads every stored row for one user in a single round of parallel queries.
 * Shared by all read paths so the snapshot query lives in exactly one place.
 * Every query is filtered by the caller's own id and RLS enforces the same
 * restriction in the database.
 */
export async function loadSnapshotRows(
  supabase: AuthedClient,
  userId: string,
  operation: string,
): Promise<FinancialSnapshot> {
  const [profile, financialProfile, incomes, expenses, savings, debts, investments, goals] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("financial_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("incomes").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("expenses").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("savings").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("debts").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("investments").select("*").eq("user_id", userId).order("created_at"),
      supabase
        .from("goals")
        .select("*")
        .eq("user_id", userId)
        .neq("status", "deleted")
        .order("priority"),
    ]);

  for (const result of [
    profile,
    financialProfile,
    incomes,
    expenses,
    savings,
    debts,
    investments,
    goals,
  ]) {
    assertNoDbError(result, operation);
  }

  return {
    profile: profile.data,
    financialProfile: financialProfile.data,
    incomes: incomes.data ?? [],
    expenses: expenses.data ?? [],
    savings: savings.data ?? [],
    debts: debts.data ?? [],
    investments: investments.data ?? [],
    goals: goals.data ?? [],
  };
}

export const getFinancialSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FinancialSnapshot> =>
    loadSnapshotRows(context.supabase, context.userId, "loading your financial details"),
  );

/** Builds the engine input from stored rows. Shared by analyse and generate. */
export function toPlannerInput(snapshot: FinancialSnapshot): PlannerInput {
  const fp = snapshot.financialProfile;
  return {
    currency: snapshot.profile?.currency ?? "INR",
    displayName: snapshot.profile?.display_name ?? null,
    riskProfile: (fp?.risk_profile as PlannerInput["riskProfile"]) ?? "moderate",
    investmentExperience:
      (fp?.investment_experience as PlannerInput["investmentExperience"]) ?? "none",
    emergencyMonthsTarget: Number(fp?.emergency_months_target ?? 6),
    riskScore:
      fp?.risk_score === null || fp?.risk_score === undefined ? null : Number(fp.risk_score),
    incomeStability: (fp?.income_stability as PlannerInput["incomeStability"]) ?? null,
    incomes: snapshot.incomes.map((r) => ({
      id: r.id,
      kind: r.kind,
      label: r.label,
      monthly_amount: Number(r.monthly_amount),
    })),
    expenses: snapshot.expenses.map((r) => ({
      id: r.id,
      category: r.category,
      monthly_amount: Number(r.monthly_amount),
      is_essential: r.is_essential,
    })),
    savings: snapshot.savings.map((r) => ({ id: r.id, kind: r.kind, amount: Number(r.amount) })),
    debts: snapshot.debts.map((r) => ({
      id: r.id,
      kind: r.kind,
      outstanding_amount: Number(r.outstanding_amount),
      monthly_payment: Number(r.monthly_payment),
      interest_rate: Number(r.interest_rate),
    })),
    investments: snapshot.investments.map((r) => ({
      id: r.id,
      kind: r.kind,
      current_value: Number(r.current_value),
      monthly_contribution: Number(r.monthly_contribution),
    })),
    goals: snapshot.goals.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      target_amount: Number(r.target_amount),
      current_amount: Number(r.current_amount),
      target_date: r.target_date,
      priority: r.priority,
      status: r.status,
    })),
  };
}

export const analyseCurrentPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{
      analysis: PlannerAnalysis;
      onboardingCompleted: boolean;
      displayName: string | null;
      currency: string;
    }> => {
      const snapshot = await loadSnapshotRows(
        context.supabase,
        context.userId,
        "analysing your plan",
      );
      return {
        analysis: analysePlan(toPlannerInput(snapshot)),
        onboardingCompleted: snapshot.profile?.onboarding_completed ?? false,
        displayName: snapshot.profile?.display_name ?? null,
        currency: snapshot.profile?.currency ?? "INR",
      };
    },
  );

/* ------------------------------------------------------------- profile io */

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        display_name: z.string().trim().min(1).max(80).optional(),
        currency: z.string().length(3).optional(),
        onboarding_step: z.number().int().min(1).max(9).optional(),
        onboarding_completed: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .upsert(compact({ id: context.userId, ...data }), { onConflict: "id" });
    assertNoDbError({ error }, "saving your profile");
    return { ok: true };
  });

export const updateFinancialProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        age_range: z.string().max(40).optional(),
        occupation: z.string().max(40).optional(),
        income_stability: z.string().max(40).optional(),
        investment_experience: experienceSchema.optional(),
        risk_answers: z.record(z.string(), z.number()).optional(),
        risk_score: z.number().min(0).max(20).optional(),
        risk_profile: riskProfileSchema.optional(),
        emergency_months_target: z.number().min(1).max(24).optional(),
        has_debt: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("financial_profiles")
      .upsert(compact({ user_id: context.userId, ...data }), { onConflict: "user_id" });
    assertNoDbError({ error }, "saving your financial profile");
    return { ok: true };
  });

/* -------------------------------------------------------- bulk ledger set */

const ledgerSchema = z.object({
  incomes: z
    .array(
      z.object({
        kind: z.string().max(40),
        label: z.string().max(60).nullable().optional(),
        monthly_amount: money,
      }),
    )
    .optional(),
  expenses: z
    .array(
      z.object({ category: z.string().max(40), monthly_amount: money, is_essential: z.boolean() }),
    )
    .optional(),
  savings: z.array(z.object({ kind: z.string().max(40), amount: money })).optional(),
  debts: z
    .array(
      z.object({
        kind: z.string().max(40),
        outstanding_amount: money,
        monthly_payment: money,
        interest_rate: z.number().min(0).max(100),
      }),
    )
    .optional(),
  investments: z
    .array(
      z.object({ kind: z.string().max(40), current_value: money, monthly_contribution: money }),
    )
    .optional(),
});

/**
 * Replaces a whole ledger section for the signed-in user. The onboarding wizard
 * and the edit screens both submit complete sections, which keeps the stored
 * rows consistent with what the user sees on screen.
 */
export const replaceLedger = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ledgerSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const sections = [
      ["incomes", data.incomes],
      ["expenses", data.expenses],
      ["savings", data.savings],
      ["debts", data.debts],
      ["investments", data.investments],
    ] as const;

    for (const [table, rows] of sections) {
      if (!rows) continue;
      const { error: deleteError } = await supabase.from(table).delete().eq("user_id", userId);
      assertNoDbError({ error: deleteError }, `replacing your ${table}`);
      if (rows.length === 0) continue;
      const { error: insertError } = await supabase
        .from(table)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(rows.map((row) => ({ ...row, user_id: userId })) as any);
      assertNoDbError({ error: insertError }, `replacing your ${table}`);
    }

    return { ok: true };
  });

/* ------------------------------------------------------------------ goals */

const goalSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.string().max(40).default("custom"),
  target_amount: z.number().positive().max(1_000_000_000),
  current_amount: money.default(0),
  target_date: z.string().date().nullable().optional(),
  priority: z.number().int().min(1).max(3).default(2),
});

export const createGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => goalSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("goals")
      .insert({ ...data, target_date: data.target_date ?? null, user_id: context.userId })
      .select()
      .single();
    assertNoDbError({ error }, "creating a goal");
    return row;
  });

export const updateGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    goalSchema
      .partial()
      .extend({
        id: z.string().uuid(),
        status: z.enum(["active", "completed", "deleted"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data;
    const { error } = await context.supabase
      .from("goals")
      .update(compact(fields))
      .eq("id", id)
      .eq("user_id", context.userId);
    assertNoDbError({ error }, "updating a goal");
    return { ok: true };
  });

export const deleteGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("goals")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    assertNoDbError({ error }, "removing a goal");
    return { ok: true };
  });

/* ------------------------------------------------------------ plan history */

export const savePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const snapshot = await loadSnapshotRows(supabase, userId, "saving your plan");
    const analysis = analysePlan(toPlannerInput(snapshot));

    const { data: row, error } = await supabase
      .from("plans")
      .insert({
        user_id: userId,
        total_income: analysis.totalIncome,
        total_expenses: analysis.totalExpenses,
        monthly_surplus: analysis.monthlySurplus,
        primary_priority: analysis.primaryAction.code,
        primary_priority_title: analysis.primaryAction.title,
        risk_profile: analysis.riskProfile,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        snapshot: analysis as any,
      })
      .select()
      .single();
    assertNoDbError({ error }, "saving your plan");
    return row;
  });

export const listPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("plans")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    assertNoDbError({ error }, "loading your saved plans");
    return data ?? [];
  });

export const deletePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("plans")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    assertNoDbError({ error }, "removing a saved plan");
    return { ok: true };
  });
