import Constants from "expo-constants";

import { ENV } from "@/env";
import { resolveServerBaseUrl } from "@/utils/server-url-resolution";

export function getServerBaseUrl(): string {
  const metroHostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ??
    (Constants as any).manifest?.debuggerHost;

  return resolveServerBaseUrl(ENV.EXPO_PUBLIC_SERVER_URL, process.env.EXPO_OS, metroHostUri);
}
