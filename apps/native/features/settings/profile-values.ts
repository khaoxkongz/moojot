/**
 * Settings that setup saves and the profile shows and changes. Both use these keys, so a choice made in setup is the
 * one the profile shows. The consent keys keep their `onboarding_` names because accounts already hold them.
 */
export const PROFILE_SETTING_KEYS = {
  email: "profile_email",
  /** YYYY-MM-DD, or "" when the person gave no birthday. */
  birthDate: "profile_birth_date",
  /** "1".."12", or "". */
  birthMonth: "profile_birth_month",
  personalization: "onboarding_personalization",
  updates: "onboarding_updates",
} as const;

export type ConsentSetting = "personalization" | "updates";
export type ConsentChoice = "yes" | "no";

/** A saved consent value, or null when the account never answered. */
export function consentChoice(value: string | null | undefined): ConsentChoice | null {
  return value === "yes" || value === "no" ? value : null;
}
