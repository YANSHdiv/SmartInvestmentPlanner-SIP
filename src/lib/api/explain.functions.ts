/**
 * Optional plain-language explanation layer.
 *
 * This never decides anything. It receives the deterministic planner's output
 * and rewrites it in simpler words. If no model key is configured the app keeps
 * working and the UI simply hides the explanation.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const summarySchema = z.object({
  currency: z.string().min(1).max(8),
  totalIncome: z.number(),
  totalExpenses: z.number(),
  monthlySurplus: z.number(),
  accessibleSavings: z.number(),
  emergencyCoverageMonths: z.number(),
  emergencyTargetMonths: z.number(),
  hasExpensiveDebt: z.boolean(),
  riskProfile: z.string(),
  primaryTitle: z.string().max(300),
  primaryWhy: z.string().max(1200),
  primaryHow: z.string().max(1200),
  primaryAfterThis: z.string().max(1200),
});

const SYSTEM_PROMPT = [
  "You explain an already-decided financial plan to a complete beginner.",
  "Rules you must follow:",
  "- Never change, contradict or re-rank the recommendation you are given.",
  "- Never guarantee or predict returns, and never forecast markets.",
  "- Never invent numbers, products, brands or facts that are not in the input.",
  "- Never claim certainty and never present yourself as a licensed adviser.",
  "- Refer only to the figures provided.",
  "Write 3 short paragraphs in plain language: what the next action is, why the person's own numbers led to it, and what changes once it is done.",
].join("\n");

export const explainPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => summarySchema.parse(input))
  .handler(async ({ data }) => {
    // Optional feature: configure any OpenAI-compatible chat completions
    // endpoint through AI_GATEWAY_URL / AI_GATEWAY_API_KEY. When either is
    // absent the app simply reports the explanation as unavailable and the
    // deterministic plan stays fully intact.
    const apiKey = process.env["AI_GATEWAY_API_KEY"];
    const url = process.env["AI_GATEWAY_URL"];
    if (!apiKey || !url) {
      return { available: false as const, explanation: null };
    }

    const model = process.env["AI_GATEWAY_MODEL"] ?? "gpt-4o-mini";


    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: JSON.stringify(data) },
          ],
        }),
      });

      if (!response.ok) {
        return { available: false as const, explanation: null };
      }

      const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      const explanation = payload.choices?.[0]?.message?.content?.trim() ?? null;
      return explanation
        ? { available: true as const, explanation }
        : { available: false as const, explanation: null };
    } catch {
      return { available: false as const, explanation: null };
    }
  });
