import { describe, expect, it, vi } from "vitest";

import { AppError, assertNoDbError, redact, reportError, toUserMessage } from "./errors";

describe("error handling", () => {
  it("redacts connection strings, tokens and API keys from log text", () => {
    const text =
      "connect postgresql://user:pa55@db.example.com:5432/app with Bearer abc.def-ghi and sb_secret_ABC123 and eyJhbG.eyJzdWI.sig";
    const safe = redact(text);
    expect(safe).not.toContain("pa55");
    expect(safe).not.toContain("sb_secret_ABC123");
    expect(safe).not.toContain("eyJhbG.eyJzdWI.sig");
    expect(safe).not.toContain("Bearer abc.def-ghi");
    expect(safe).toContain("[redacted]");
  });

  it("logs the technical cause but returns only a user-safe message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = reportError(
      "database",
      "loading goals",
      new Error('relation "goals" does not exist'),
    );
    expect(error).toBeInstanceOf(AppError);
    expect(error.userMessage).not.toContain("relation");
    expect(error.status).toBe(503);
    expect(spy).toHaveBeenCalledOnce();
    expect(String(spy.mock.calls[0]?.[0])).toContain("loading goals");
    spy.mockRestore();
  });

  it("treats a permission refusal as an authorization problem", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      assertNoDbError(
        { error: { message: "permission denied for table goals", code: "42501" } },
        "reading goals",
      );
      throw new Error("should have thrown");
    } catch (thrown) {
      expect(thrown).toBeInstanceOf(AppError);
      expect((thrown as AppError).kind).toBe("authorization");
      expect((thrown as AppError).userMessage).not.toMatch(/permission denied|goals/);
    }
    spy.mockRestore();
  });

  it("passes clean results through untouched", () => {
    expect(() => assertNoDbError({ error: null }, "reading goals")).not.toThrow();
  });

  it("never surfaces raw internals to the user", () => {
    const message = toUserMessage(new Error("ECONNREFUSED 10.1.2.3:5432"));
    expect(message).not.toContain("ECONNREFUSED");
    expect(message.length).toBeGreaterThan(10);
    expect(toUserMessage(new AppError("authentication"))).toMatch(/sign in/i);
  });
});
