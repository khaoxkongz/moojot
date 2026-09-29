import type { AppRouterClient } from "@moojot/api/features/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { SimpleCsrfProtectionLinkPlugin } from "@orpc/client/plugins";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { Platform } from "react-native";

import { authClient } from "@/lib/auth-client";
import { getServerBaseUrl } from "@/utils/server-url";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      console.log(error);
    },
  }),
});

async function expoFetch(request: Request, init?: RequestInit) {
  const { fetch } = await import("expo/fetch");

  return fetch(request.url, {
    body: await request.blob(),
    headers: request.headers,
    method: request.method,
    signal: request.signal,
    ...init,
  });
}

/** Fetch used for authenticated RPC calls from this app. */
export function rpcFetch(request: Request, init?: RequestInit) {
  return expoFetch(request, {
    ...init,
    // Better Auth Expo forwards the session cookie manually on native.
    credentials: Platform.OS === "web" ? "include" : "omit",
  });
}

/** Session headers for authenticated RPC calls from this app. */
export async function rpcHeaders(): Promise<Record<string, string>> {
  if (Platform.OS === "web") {
    return {};
  }
  const cookies = await authClient.getCookie();
  return cookies ? { Cookie: cookies } : {};
}

export const link = new RPCLink({
  url: () => `${getServerBaseUrl()}/rpc`,
  plugins: [new SimpleCsrfProtectionLinkPlugin()],
  fetch: (request, init) => rpcFetch(request, init),
  headers: rpcHeaders,
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
