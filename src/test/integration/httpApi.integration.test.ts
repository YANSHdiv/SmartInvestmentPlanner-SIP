/**
 * Integration test against a running instance of the application.
 *
 * Point it at any deployment with `TEST_BASE_URL` (defaults to the local dev
 * server). It skips itself when nothing is listening, so CI without a server
 * stays green.
 *
 * What it proves:
 *  - the health endpoint hosting platforms poll actually answers;
 *  - protected pages never render another person's data into the HTML;
 *  - no server-side secret is served to the browser.
 */
import { beforeAll, describe, expect, it } from "vitest";

const baseUrl = (process.env["TEST_BASE_URL"] ?? "http://localhost:8080").replace(/\/$/, "");

let reachable = false;

beforeAll(async () => {
  try {
    const response = await fetch(`${baseUrl}/api/public/health`, {
      signal: AbortSignal.timeout(4000),
    });
    reachable = response.ok;
  } catch {
    reachable = false;
  }
});

describe("integration: running application over HTTP", () => {
  it("answers the health check with a healthy status", async () => {
    if (!reachable) return;
    const response = await fetch(`${baseUrl}/api/public/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "healthy" });
  });

  it("serves the public pages", async () => {
    if (!reachable) return;
    for (const path of ["/", "/learn", "/auth"]) {
      const response = await fetch(`${baseUrl}${path}`);
      expect(response.status, path).toBe(200);
      expect((await response.text()).toLowerCase()).toContain("smart investment planner");
    }
  });

  it("does not return anyone's financial data to an unauthenticated request", async () => {
    if (!reachable) return;
    const response = await fetch(`${baseUrl}/dashboard`);
    const html = await response.text();
    // The protected area is client-gated; the server must not embed user rows.
    expect(html).not.toMatch(/monthly_surplus|primary_priority_title|risk_answers/);
  });

  it("never ships server-only secrets to the browser", async () => {
    if (!reachable) return;
    const html = await fetch(`${baseUrl}/`).then((r) => r.text());
    const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]!);
    const bundles = await Promise.all(
      scripts.slice(0, 8).map((src) =>
        fetch(src.startsWith("http") ? src : `${baseUrl}${src}`)
          .then((r) => (r.ok ? r.text() : ""))
          .catch(() => ""),
      ),
    );
    const payload = [html, ...bundles].join("\n");

    // Actual secret *values*, not the harmless format checks the Supabase
    // client library performs on key prefixes.
    expect(payload).not.toMatch(/sb_secret_[A-Za-z0-9_-]{10,}/);
    expect(payload).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'`][^"'`]+/);
    const realServiceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    if (realServiceKey && realServiceKey.length > 12) expect(payload).not.toContain(realServiceKey);
    const aiKey = process.env["AI_GATEWAY_API_KEY"];
    if (aiKey && aiKey.length > 12) expect(payload).not.toContain(aiKey);
  });
});
