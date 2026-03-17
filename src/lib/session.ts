/**
 * Lightweight anonymous session tracking.
 * Generates a stable UUID on first visit and persists it in localStorage.
 * Lets us distinguish repeat visitors even without authentication.
 */
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  const KEY = "grove_session_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
