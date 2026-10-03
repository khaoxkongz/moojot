/**
 * The settings that setup saves, in one place for the server and the app. The profile shows and changes the profile
 * and consent ones. The key strings stay as they are: accounts already hold them.
 */
export const SETUP_SETTING_KEYS = {
  email: "profile_email",
  /** YYYY-MM-DD, or "" when the person gave no birthday. */
  birthDate: "profile_birth_date",
  /** "1".."12", or "". */
  birthMonth: "profile_birth_month",
  /** "yes" or "no". */
  personalization: "onboarding_personalization",
  /** "yes" or "no". */
  updates: "onboarding_updates",
  /** A JSON list of goal keys. */
  goals: "onboarding_reasons",
  /** When the person accepted the terms, as an ISO time. */
  termsAcceptedAt: "onboarding_terms_accepted_v1",
  /** "true" once every other answer is saved. The setup check reads it. */
  complete: "onboarding_complete_v1",
} as const;
