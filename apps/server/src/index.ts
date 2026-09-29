import { initLogger } from "evlog";
import { createServerApp } from "./app";
import { ENV } from "./env.server";
import { auth, db, apiRuntime } from "./services";

initLogger({ env: { service: "moojot-server" } });

const app = createServerApp({ auth, db, runtime: apiRuntime, env: ENV });

export default {
  fetch(request: Request, server: Bun.Server<undefined>) {
    if (new URL(request.url).pathname === "/rpc/import/slip/auto-import") {
      // Effect owns the pre-write deadline; a committed write must return its real result.
      server.timeout(request, 0);
    }
    return app.fetch(request);
  },
};
