/**
 * The two consent choices that setup saves and the profile shows and changes. Their keys are in
 * `SETUP_SETTING_KEYS` (`@moojot/api/shared/finance/setup-keys`), so a choice made in setup is the one the profile shows.
 */
export type ConsentSetting = "personalization" | "updates";
export type ConsentChoice = "yes" | "no";

/** A saved consent value, or null when the account never answered. */
export function consentChoice(value: string | null | undefined): ConsentChoice | null {
  return value === "yes" || value === "no" ? value : null;
}

/** The value a consent switch saves. */
export const consentValue = (on: boolean): ConsentChoice => (on ? "yes" : "no");
