/**
 * Integration test for the security boundary around financial data.
 *
 * These tests talk to the real PostgreSQL Data API, so they prove the actual
 * Row-Level Security policies, not a mock of them:
 *
 *  1. an unauthenticated request cannot read or write financial tables;
 *  2. an authenticated request only ever sees its own rows, even when it asks
 *     for another user's id explicitly;
 *  3. an authenticated request cannot write a row owned by somebody else.
 *
 * They skip themselves when the backend URL/key (and, for the signed-in cases,
 * TEST_USER_ACCESS_TOKEN) are not present, so CI stays green without secrets.
 */
import { describe, expect, it } from "vitest";

const url =
  (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ?? process.env["SUPABASE_URL"];
const anonKey =
  (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined) ??
  process.env["SUPABASE_PUBLISHABLE_KEY"];
const accessToken = process.env["TEST_USER_ACCESS_TOKEN"];

const FINANCIAL_TABLES = [
  "profiles",
  "financial_profiles",
  "incomes",
  "expenses",
  "savings",
  "debts",
  "investments",
  "goals",
  "plans",
] as const;

const OTHER_USER = "00000000-0000-4000-8000-000000000123";

function rest(path: string, token?: string, init: RequestInit = {}) {
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: anonKey!,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

function subjectOf(token: string): string {
  const [, payload] = token.split(".");
  const json = JSON.parse(Buffer.from(payload!, "base64").toString("utf8")) as { sub: string };
  return json.sub;
}

describe.skipIf(!url || !anonKey)("integration: unauthenticated access is refused", () => {
  it.each(FINANCIAL_TABLES)("returns no rows from %s without a session", async (table) => {
    const response = await rest(`${table}?select=*`);
    if (response.ok) {
      // RLS with no matching policy yields an empty set rather than an error.
      expect(await response.json()).toEqual([]);
    } else {
      expect([401, 403]).toContain(response.status);
    }
  });

  it("refuses to insert financial data without a session", async () => {
    const response = await rest("incomes", undefined, {
      method: "POST",
      body: JSON.stringify({ user_id: OTHER_USER, kind: "salary", monthly_amount: 1000 }),
    });
    expect(response.ok).toBe(false);
    expect([401, 403]).toContain(response.status);
  });
});

describe.skipIf(!url || !anonKey || !accessToken)(
  "integration: one user cannot reach another user's data",
  () => {
    it("only returns rows belonging to the signed-in user", async () => {
      const me = subjectOf(accessToken!);
      for (const table of [
        "incomes",
        "expenses",
        "savings",
        "debts",
        "investments",
        "goals",
        "plans",
      ]) {
        const response = await rest(`${table}?select=user_id`, accessToken);
        expect(response.ok).toBe(true);
        const rows = (await response.json()) as { user_id: string }[];
        for (const row of rows) expect(row.user_id).toBe(me);
      }
    });

    it("returns nothing when asking for another user's rows by id", async () => {
      for (const table of ["incomes", "goals", "plans"]) {
        const response = await rest(`${table}?select=*&user_id=eq.${OTHER_USER}`, accessToken);
        expect(response.ok).toBe(true);
        expect(await response.json()).toEqual([]);
      }
    });

    it("cannot read another user's profile row by primary key", async () => {
      const response = await rest(`profiles?select=*&id=eq.${OTHER_USER}`, accessToken);
      expect(response.ok).toBe(true);
      expect(await response.json()).toEqual([]);
    });

    it("cannot insert a row owned by another user", async () => {
      const response = await rest("goals", accessToken, {
        method: "POST",
        body: JSON.stringify({
          user_id: OTHER_USER,
          name: "isolation probe",
          target_amount: 1000,
        }),
      });
      expect(response.ok).toBe(false);
      expect([401, 403]).toContain(response.status);
    });

    it("cannot update or delete another user's rows", async () => {
      const patch = await rest(`goals?user_id=eq.${OTHER_USER}`, accessToken, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ name: "isolation probe" }),
      });
      // Either refused outright, or allowed but matching zero rows.
      if (patch.ok) expect(await patch.json()).toEqual([]);
      else expect([401, 403]).toContain(patch.status);

      const remove = await rest(`goals?user_id=eq.${OTHER_USER}`, accessToken, {
        method: "DELETE",
        headers: { Prefer: "return=representation" },
      });
      if (remove.ok) expect(await remove.json()).toEqual([]);
      else expect([401, 403]).toContain(remove.status);
    });
  },
);
