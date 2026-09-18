/**
 * Consistent error handling for server functions and the UI.
 *
 * Two audiences, one place:
 *  - the person using the app gets a short, understandable sentence;
 *  - the server log gets enough detail to debug, with nothing sensitive in it.
 *
 * Nothing here ever forwards a raw database message, stack trace, token or
 * connection string to the browser.
 */

export type AppErrorKind =
  | "validation"
  | "authentication"
  | "authorization"
  | "not_found"
  | "database"
  | "service_unavailable"
  | "unexpected";

const STATUS: Record<AppErrorKind, number> = {
  validation: 400,
  authentication: 401,
  authorization: 403,
  not_found: 404,
  database: 503,
  service_unavailable: 503,
  unexpected: 500,
};

const DEFAULT_MESSAGE: Record<AppErrorKind, string> = {
  validation: "Some of the details entered could not be accepted. Please check them and try again.",
  authentication: "Please sign in to continue.",
  authorization: "You do not have access to this information.",
  not_found: "We could not find what you were looking for.",
  database: "We could not reach your saved information just now. Please try again in a moment.",
  service_unavailable: "That service is temporarily unavailable. The rest of the app still works.",
  unexpected: "Something went wrong on our side. Please try again.",
};

export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly status: number;
  /** Safe to show to the person using the app. */
  readonly userMessage: string;

  constructor(kind: AppErrorKind, userMessage?: string) {
    super(userMessage ?? DEFAULT_MESSAGE[kind]);
    this.name = "AppError";
    this.kind = kind;
    this.status = STATUS[kind];
    this.userMessage = userMessage ?? DEFAULT_MESSAGE[kind];
  }
}

/** Sensitive fragments that must never reach a log line. */
const REDACTIONS: RegExp[] = [
  /postgres(?:ql)?:\/\/[^\s"']+/gi, // connection strings
  /\b(?:eyJ[\w-]+\.[\w-]+\.[\w-]+)\b/g, // JWTs
  /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+/g, // Supabase API keys
  /\bBearer\s+[A-Za-z0-9._-]+/gi,
];

export function redact(text: string): string {
  return REDACTIONS.reduce((acc, pattern) => acc.replace(pattern, "[redacted]"), text);
}

/**
 * Logs the technical cause on the server, then returns an AppError carrying only
 * the user-safe sentence. Callers `throw` the result.
 */
export function reportError(
  kind: AppErrorKind,
  operation: string,
  cause: unknown,
  userMessage?: string,
): AppError {
  const detail =
    cause instanceof Error
      ? `${cause.name}: ${cause.message}`
      : typeof cause === "object" && cause !== null && "message" in cause
        ? String((cause as { message: unknown }).message)
        : String(cause);
  console.error(`[${kind}] ${operation}: ${redact(detail)}`);
  return new AppError(kind, userMessage);
}

/** Throws a user-safe error when a Supabase/PostgREST result carries one. */
export function assertNoDbError(
  result: { error: { message: string; code?: string } | null },
  operation: string,
): void {
  if (!result.error) return;
  // PostgREST reports an RLS refusal as 42501 / "permission denied".
  const code = result.error.code ?? "";
  const kind: AppErrorKind =
    code === "42501" || /permission denied/i.test(result.error.message)
      ? "authorization"
      : "database";
  throw reportError(kind, operation, result.error);
}

/** Turns anything thrown into a sentence that is safe to render. */
export function toUserMessage(error: unknown): string {
  if (error instanceof AppError) return error.userMessage;
  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    (error as Error).name === "ZodError"
  ) {
    return DEFAULT_MESSAGE.validation;
  }
  if (error instanceof Error && /unauthor|401/i.test(error.message))
    return DEFAULT_MESSAGE.authentication;
  return DEFAULT_MESSAGE.unexpected;
}
