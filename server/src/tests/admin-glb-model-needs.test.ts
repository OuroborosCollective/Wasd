import { describe, expect, it } from "vitest";
import { buildAdminGlbModelNeeds } from "../modules/content/adminGlbModelNeeds.js";

describe("buildAdminGlbModelNeeds", () => {
  it("lists missing content models as needed", () => {
    const result = buildAdminGlbModelNeeds({
      missingModels: [
        {
          urlPath: "/assets/models/world-assets/props/fence_front.glb",
          source: "world/objects.json: obj_fence_01",
        },
      ],
      modelUrls: [],
      links: [],
      pools: { defaults: {}, pools: {} },
      objectTypes: [],
    });

    expect(result.needs.length).toBe(1);
    expect(result.needs[0]?.kind).toBe("missing_content_model");
    expect(result.needs[0]?.suggestedUrlPath).toBe(
      "/assets/models/world-assets/props/fence_front.glb",
    );
    expect(result.stats.missingContentCount).toBe(1);
  });

  it("marks logical needs as satisfied when usable link exists", () => {
    const linkedUrl = "/assets/models/world-assets/props/fence_left.glb";
    const result = buildAdminGlbModelNeeds({
      missingModels: [],
      modelUrls: [linkedUrl],
      links: [
        {
          glbPath: linkedUrl,
          targetType: "object_group",
          targetId: "fence_left",
        },
      ],
      pools: {
        defaults: {},
        pools: {},
      },
      objectTypes: ["fence"],
    });

    const logicalNeed = result.satisfied.find(
      (entry) => entry.id === "logical:fence_left",
    );
    expect(logicalNeed).toBeTruthy();
    expect(logicalNeed?.status).toBe("satisfied");
    expect(logicalNeed?.satisfiedBy).toBe("glb_link");
  });
});
