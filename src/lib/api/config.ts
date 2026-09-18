/**
 * Single source of truth for where the API lives.
 *
 * The UI and the API ship in the same deployment, so the default is an empty
 * base URL: every request is same-origin and no production host name is ever
 * written into the source. If the API is later hosted on its own domain, set
 * `VITE_API_BASE_URL` in the environment and nothing else has to change.
 *
 * Only `VITE_`-prefixed values are compiled into the browser bundle. Secrets
 * (service-role key, JWT secret, provider API keys) are read on the server
 * inside request handlers and never reach the client.
 */
export const API_BASE_URL: string = (
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? ""
).replace(/\/$/, "");

/** Build an absolute API path, respecting the configured base URL. */
export function apiUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${suffix}`;
}

/** Health endpoint used by hosting platforms and uptime checks. */
export const HEALTH_PATH = "/api/public/health";
