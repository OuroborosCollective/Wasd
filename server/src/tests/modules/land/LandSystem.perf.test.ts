import { describe, it, expect, vi } from "vitest";
import { LandSystem } from "../../../modules/land/LandSystem.js";
import { DatabaseService } from "../../../core/Database.js";

describe("LandSystem Performance", () => {
  it("should initialize fast with many lands", async () => {
    const numLands = 1000;
    const structuresPerLand = 5;

    const mockDb = {
      query: vi.fn().mockImplementation(async (query: string, params?: any[]) => {
        if (query.includes("CREATE TABLE") || query.includes("ALTER TABLE")) {
          return { rows: [] };
        }

        if (query.includes("SELECT * FROM player_lands")) {
          const rows = [];
          for (let i = 0; i < numLands; i++) {
            rows.push({
              id: `land-${i}`,
              owner_id: `owner-${i}`,
              owner_name: `Owner ${i}`,
              name: `Land ${i}`,
              x: i,
              y: i,
              radius: 100,
              claimed_at: new Date()
            });
          }
          return { rows };
        }

        if (query.includes("SELECT * FROM land_structures WHERE land_id=$1")) {
          // Simulate latency
          await new Promise(resolve => setTimeout(resolve, 1));
          const landId = params![0];
          const rows = [];
          for (let i = 0; i < structuresPerLand; i++) {
            rows.push({
              id: `struct-${landId}-${i}`,
              land_id: landId,
              type: "house",
              x: 0, y: 0, z: 0,
              rot_y: 0, scale: 1,
              glb_path: "path",
              name: "house",
              placed_at: new Date()
            });
          }
          return { rows };
        }

        if (query.includes("SELECT * FROM land_structures")) {
          const rows = [];
          for (let i = 0; i < numLands; i++) {
            const landId = `land-${i}`;
            for (let j = 0; j < structuresPerLand; j++) {
              rows.push({
                id: `struct-${landId}-${j}`,
                land_id: landId,
                type: "house",
                x: 0, y: 0, z: 0,
                rot_y: 0, scale: 1,
                glb_path: "path",
                name: "house",
                placed_at: new Date()
              });
            }
          }
          return { rows };
        }

        return { rows: [] };
      })
    } as unknown as DatabaseService;

    const system = new LandSystem(mockDb);

    const start = performance.now();
    await system.init();
    const end = performance.now();

    console.log(`LandSystem init took ${end - start}ms with ${numLands} lands and ${structuresPerLand} structures per land.`);
    expect(end - start).toBeLessThan(5000); // just a sanity check
  });
});
