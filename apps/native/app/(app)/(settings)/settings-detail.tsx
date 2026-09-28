import { Redirect, useLocalSearchParams } from "expo-router";

const destinations = {
  account: "/settings/account",
  cards: "/settings/cards",
  calendar: "/settings/calendar",
  theme: "/settings/theme",
  language: "/settings/language",
  guide: "/settings/guide",
  faq: "/settings/faq",
  slips: "/settings/slips",
  "supported-cards": "/settings/supported-cards",
  "slip-help": "/settings/slip-help",
} as const;

export default function LegacySettingsDetailRoute() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const destination =
    typeof section === "string" && Object.hasOwn(destinations, section)
      ? destinations[section as keyof typeof destinations]
      : destinations.account;

  return <Redirect href={destination} />;
}
