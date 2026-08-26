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


describe("WS Client-2D Thin-Shell combat migration", () => {
  it("accepts a canonical movement intent through the Thin-Shell adapter", async () => {
    const runtime = await createThinShellWebSocketRuntime();
    const socket = await openSocket(runtime.port);
    const identityHash = "combat-runtime-test";
    const playerId = `client2d:${identityHash}`;

    try {
      const welcomePromise = waitForMessage(socket, (data) => data.type === "welcome");
      socket.send(JSON.stringify(client2DLogin(identityHash, "Combat Tester", { x: 4, y: 8, z: 0 })));
      await welcomePromise;

      const acknowledgementPromise = waitForMessage(socket, (data) => data.type === "move_intent_ack");
      socket.send(JSON.stringify({
        type: "move_intent",
        source: "client-2d",
        dx: 1,
        dy: 0,
        sequenceId: 7,
      }));
      const acknowledgement = await acknowledgementPromise;

      expect(acknowledgement.payload.ok).toBe(true);
      expect(acknowledgement.payload.sequenceId).toBe(7);
      expect(acknowledgement.payload.pending).toBeGreaterThanOrEqual(1);
      expect(runtime.tick.playerSystem.getPlayer(playerId)?.position.x).toBe(4);
    } finally {
      await closeSocket(socket);
      await runtime.close();
    }
  });
});
