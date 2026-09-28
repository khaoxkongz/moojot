function isLoopback(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isLanHost(hostname: string): boolean {
  if (hostname.endsWith(".local")) return true;
  const octets = hostname.split(".").map(Number);
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return false;
  }
  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127)
  );
}

function hostnameFromHostUri(hostUri: string | undefined): string | null {
  if (!hostUri) return null;
  try {
    return new URL(hostUri.includes("://") ? hostUri : `http://${hostUri}`).hostname;
  } catch {
    return null;
  }
}

/** Expo Go runs on the phone, so its localhost is not the Mac running the API. */
export function resolveServerBaseUrl(
  configuredUrl: string,
  platform: string | undefined,
  metroHostUri: string | undefined
): string {
  const url = new URL(configuredUrl.trim());
  if ((platform === "ios" || platform === "android") && isLoopback(url.hostname)) {
    const metroHost = hostnameFromHostUri(metroHostUri);
    if (metroHost && isLanHost(metroHost)) url.hostname = metroHost;
  }
  return url.toString().replace(/\/+$/, "");
}
