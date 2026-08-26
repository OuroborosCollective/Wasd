import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { GameWebSocketServer } from "../../networking/WebSocketServer.js";
import { worldTickAdapter, type WorldTickAdapter } from "../../core/are/WorldTickThinShellAdapter.js";
import { installClient2DPublicKeyLoginBridge } from "../../core/installClient2DPublicKeyLoginBridge.js";

export interface ThinShellWebSocketRuntime {
  readonly httpServer: HttpServer;
  readonly ws: GameWebSocketServer;
  readonly tick: WorldTickAdapter;
  readonly port: number;
  close(): Promise<void>;
}

/**
 * Mirrors the current production bootstrap: GameWebSocketServer plus the
 * WorldTickThinShell-backed adapter and the Client-2D public-key bridge.
 */
export async function createThinShellWebSocketRuntime(): Promise<ThinShellWebSocketRuntime> {
  const httpServer = createServer();
  const ws = new GameWebSocketServer(httpServer);
  ws.start();

  const tick = worldTickAdapter;
  tick.attachNetworkBridge(ws);
  installClient2DPublicKeyLoginBridge(ws, tick);
  await tick.init();

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const port = (httpServer.address() as AddressInfo).port;

  return {
    httpServer,
    ws,
    tick,
    port,
    async close() {
      ws.stop();
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

export function client2DLogin(identityHash: string, name: string, spawn = { x: 0, y: 0, z: 0 }) {
  return {
    type: "login",
    identityHash,
    source: "client-2d",
    appearance: "client-2d",
    name,
    role: "Explorer",
    spawn,
  };
}
