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


describe("WS Client-2D Thin-Shell reconnect flow", () => {
  it("reconnects the same public-key identity through a new WebSocket transport", async () => {
    const identityHash = "reconnect-runtime-test";
    const playerId = `client2d:${identityHash}`;

    const firstRuntime = await createThinShellWebSocketRuntime();
    const firstSocket = await openSocket(firstRuntime.port);
    try {
      const firstWelcomePromise = waitForMessage(firstSocket, (data) => data.type === "welcome");
      firstSocket.send(JSON.stringify(client2DLogin(identityHash, "Reconnect Tester")));
      const firstWelcome = await firstWelcomePromise;
      expect(firstWelcome.playerId).toBe(playerId);
      expect(firstRuntime.tick.playerSystem.getPlayer(playerId)).toBeTruthy();
    } finally {
      await closeSocket(firstSocket);
      await firstRuntime.close();
    }

    const secondRuntime = await createThinShellWebSocketRuntime();
    const secondSocket = await openSocket(secondRuntime.port);
    try {
      const secondWelcomePromise = waitForMessage(secondSocket, (data) => data.type === "welcome");
      secondSocket.send(JSON.stringify(client2DLogin(identityHash, "Reconnect Tester")));
      const secondWelcome = await secondWelcomePromise;
      expect(secondWelcome.playerId).toBe(playerId);
      expect(secondRuntime.tick.playerSystem.getPlayer(playerId)?.isOffline).toBe(false);
    } finally {
      await closeSocket(secondSocket);
      await secondRuntime.close();
    }
  });
});
