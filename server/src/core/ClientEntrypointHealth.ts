import { existsSync } from "node:fs";
import path from "node:path";

export interface ClientEntrypointHealth {
  readonly source: {
    readonly client2d: "apps/client-2d";
    readonly client3d: "client";
    readonly portal: "portal";
  };
  readonly runtime: {
    readonly root: string;
    readonly client2d: string;
    readonly client3d: string;
    readonly portal: string;
  };
  readonly route: {
    readonly client2d: "/2d";
    readonly client3d: "/3d";
    readonly portal: "/portal";
  };
  readonly available: {
    readonly client2d: boolean;
    readonly client3d: boolean;
    readonly portal: boolean;
  };
}

export function buildClientEntrypointHealth(input: {
  readonly clientRoot: string;
  readonly clientDistPath: string;
}): ClientEntrypointHealth {
  const client2dRuntime = path.join(input.clientDistPath, "2d", "index.html");
  const client3dRuntime = path.join(input.clientDistPath, "3d", "index.html");
  const portalRuntime = path.join(input.clientDistPath, "portal", "index.html");

  return Object.freeze({
    source: Object.freeze({
      client2d: "apps/client-2d" as const,
      client3d: "client" as const,
      portal: "portal" as const,
    }),
    runtime: Object.freeze({
      root: input.clientDistPath,
      client2d: client2dRuntime,
      client3d: client3dRuntime,
      portal: portalRuntime,
    }),
    route: Object.freeze({
      client2d: "/2d" as const,
      client3d: "/3d" as const,
      portal: "/portal" as const,
    }),
    available: Object.freeze({
      client2d: existsSync(client2dRuntime),
      client3d: existsSync(client3dRuntime),
      portal: existsSync(portalRuntime),
    }),
  });
}
