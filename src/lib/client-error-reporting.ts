/**
 * Browser-side error reporting.
 *
 * Production React does not rethrow boundary-caught errors to `window.onerror`,
 * so anything the router's error boundary catches would otherwise disappear.
 * This logs it, and hands it to an optional host telemetry hook if the page
 * happens to run inside one (an editor preview, an error-tracking snippet).
 * No SDK, account or network call of our own — remove the hooks and the app
 * behaves identically.
 */

type HostTelemetry = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: { mechanism?: string; handled?: boolean; severity?: "error" | "warning" | "info" },
  ) => void;
};

type HostErrorHook = (payload: { message: string; stack?: string; filename?: string }) => void;

function hostTelemetry(): HostTelemetry | undefined {
  return (globalThis as { __hostTelemetry?: HostTelemetry }).__hostTelemetry;
}

function hostErrorHook(): HostErrorHook | undefined {
  return (globalThis as { __reportRuntimeError?: HostErrorHook }).__reportRuntimeError;
}

/** Describes anything thrown, including the raw Response a loader may throw. */
export function describeClientError(error: unknown): string {
  if (error instanceof Response) {
    return `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`;
  }
  return error instanceof Error ? error.message : String(error);
}

export function reportClientError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const message = describeClientError(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(`[ui] ${message}`, context);

  hostTelemetry()?.captureException?.(
    error,
    { route: window.location.pathname, ...context },
    { mechanism: "react_error_boundary", handled: false, severity: "error" },
  );
  hostErrorHook()?.({
    message,
    ...(stack !== undefined && { stack }),
    filename: window.location.pathname,
  });
}
