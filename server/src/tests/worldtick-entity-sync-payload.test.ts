import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "node:http";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";

describe("WorldTick entity_sync payload", () => {
  let tmpFile: string;

  beforeAll(() => {
    tmpFile = `/tmp/entity-sync-payload-${Date.now()}.json`;
    process.env.PLAYER_SAVE_FILE = tmpFile;
    process.env.ALLOW_GUEST_LOGIN = "1";
  });

  afterAll(() => {
    delete process.env.PLAYER_SAVE_FILE;
  });

  it("includes npc_dummy training fields under byte cap", async () => {
    const { WorldTick } = await import("../core/WorldTick.js");
    const httpServer = createServer();
    const gws = new GameWebSocketServer(httpServer);
    gws.start();
    const tick = new WorldTick(gws);
    await tick.init();
    const guest = tick.playerSystem.createPlayer("guest_x", "GX");
    guest.position = { x: 12, y: 10, z: 0 };
    const ents = (tick as any).buildEntitySyncEntities() as any[];
    const msg = JSON.stringify({
      type: "entity_sync",
      entities: ents,
      chunks: (tick as any).buildEntitySyncChunks(),
    });
    expect(Buffer.byteLength(msg)).toBeLessThanOrEqual(65536);
    const e = ents.find((x) => x.id === "npc_dummy");
    expect(e?.type).toBe("npc");
    expect(e?.role).toBe("Training");
    expect(e?.combatNpcId).toBe("npc_dummy");
    expect(e?.combatThreat).toBe(false);
    expect(typeof e?.health).toBe("number");
    expect(typeof e?.maxHealth).toBe("number");
    tick.stop();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });
});
