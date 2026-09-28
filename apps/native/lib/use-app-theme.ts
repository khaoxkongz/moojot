import { themes } from "@/constants/theme";
import { useColorScheme } from "@/lib/use-color-scheme";

/** Follow the device setting; no app-level override is currently exposed. */
export function useAppTheme() {
  const { colorScheme } = useColorScheme();
  return themes[colorScheme];
}
