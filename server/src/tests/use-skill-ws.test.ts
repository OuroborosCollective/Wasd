import { describe, expect, it } from "vitest";
import WebSocket from "ws";
import { client2DLogin, createThinShellWebSocketRuntime } from "./helpers/thinShellWebSocketRuntime.js";

function waitForMessage(
  ws: WebSocket,
  predicate: (data: any) => boolean,
  timeoutMs = 8_000,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.removeListener("message", onMessage);
      reject(new Error("waitForMessage timeout"));
    }, timeoutMs);
    const onMessage = (raw: WebSocket.RawData) => {
      try {
        const data = JSON.parse(String(raw));
        if (predicate(data)) {
          clearTimeout(timeout);
          ws.removeListener("message", onMessage);
          resolve(data);
        }
      } catch {
        // Ignore malformed transport frames in integration tests.
      }
    };
    ws.on("message", onMessage);
  });
}

async function openSocket(port: number): Promise<WebSocket> {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  await new Promise<void>((resolve, reject) => {
    socket.once("open", () => resolve());
    socket.once("error", reject);
  });
  return socket;
}

async function closeSocket(socket: WebSocket): Promise<void> {
  if (socket.readyState === WebSocket.CLOSED) return;
  await new Promise<void>((resolve) => {
    socket.once("close", () => resolve());
    socket.close();
  });
}


describe("WS Client-2D Thin-Shell skill migration", () => {
  it("authenticates a Client-2D identity and acknowledges runtime presence", async () => {
    const runtime = await createThinShellWebSocketRuntime();
    const socket = await openSocket(runtime.port);
    const identityHash = "skill-runtime-test";
    const playerId = `client2d:${identityHash}`;

    try {
      const welcomePromise = waitForMessage(socket, (data) => data.type === "welcome");
      socket.send(JSON.stringify(client2DLogin(identityHash, "Skill Tester")));
      const welcome = await welcomePromise;

      expect(welcome.playerId).toBe(playerId);
      expect(runtime.tick.playerSystem.getPlayer(playerId)?.isOffline).toBe(false);

      const presencePromise = waitForMessage(socket, (data) => data.type === "presence_ack");
      socket.send(JSON.stringify({ type: "presence", source: "client-2d", seq: 1 }));
      const presence = await presencePromise;
      expect(presence.payload.playerId).toBe(playerId);
      expect(presence.payload.reason).toBe("client2d_presence");
    } finally {
      await closeSocket(socket);
      await runtime.close();
    }
  });
});
