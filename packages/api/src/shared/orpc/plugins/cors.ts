import { getEnvs } from "../../config";
import { CORSPlugin } from "@orpc/server/plugins";

export function cors() {
  const config = getEnvs();
  return new CORSPlugin({
    credentials: true,
    origin: config.CORS_ORIGIN,
  });
}
