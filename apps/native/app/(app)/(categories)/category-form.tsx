import { Redirect, useLocalSearchParams } from "expo-router";

export default function LegacyCategoryFormRoute() {
  const { section } = useLocalSearchParams<{ section?: string }>();

  if (section === "tags") return <Redirect href="/tags" />;

  return (
    <Redirect href={{ pathname: "/categories", params: { section: section === "income" ? "income" : "expense" } }} />
  );
}
