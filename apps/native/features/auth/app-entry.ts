/**
 * Which part of the app the root guard opens. `retry` means a signed-in account whose setup state is unknown: it
 * must not restart setup (it may be complete) nor open Home (it may not be).
 */
export type AppEntry = "loading" | "auth" | "onboarding" | "app" | "retry";

export type AppEntryInput = {
  session: "pending" | "signed-out" | "signed-in";
  /** Known once the check answered; a later failed refetch keeps the known answer. */
  onboarding: { status: "pending" } | { status: "failed" } | { status: "ready"; complete: boolean };
};

export function appEntry({ session, onboarding }: AppEntryInput): AppEntry {
  if (session === "pending") return "loading";
  if (session === "signed-out") return "auth";
  if (onboarding.status === "pending") return "loading";
  if (onboarding.status === "failed") return "retry";
  return onboarding.complete ? "app" : "onboarding";
}
