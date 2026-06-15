import { describe, expect, it } from "vitest";
import { createDefaultTickContext } from "../core/are/TickSystem";
import { ResourceEcologyService } from "../resources/ResourceEcologyService";
import { ResourceEcologyTickSystem } from "../resources/ResourceEcologyTickSystem";
import { attachResourceEcologySnapshots } from "../resources/ResourceEcologySnapshotAdapter";
import type { ResourceEcologyConfig } from "../resources/ResourceEcologyTypes";
import type { ResourceNodeDefinition, ResourceNodeSnapshot } from "../resources/ResourceTypes";

const baseConfig: ResourceEcologyConfig = {
  schemaVersion: 1,
  tickCadence: 1,
  kindRules: [
    {
      kind: "tree",
      capacity: 3000,
      initialStock: 3000,
      regenPerTick: 100,
      extractionUnits: 1000,
      extractionPressurePermille: 200,
      pressureDecayPermillePerTick: 50,
      collapseThreshold: 1000,
      collapseRegenPermille: 250,
    },
    {
      kind: "ore",
      capacity: 2000,
      initialStock: 2000,
      regenPerTick: 80,
      extractionUnits: 1000,
      extractionPressurePermille: 250,
      pressureDecayPermillePerTick: 25,
      collapseThreshold: 500,
      collapseRegenPermille: 200,
    },
    {
      kind: "fish_spot",
      capacity: 2500,
      initialStock: 2500,
      regenPerTick: 90,
      extractionUnits: 1000,
      extractionPressurePermille: 150,
      pressureDecayPermillePerTick: 30,
      collapseThreshold: 700,
      collapseRegenPermille: 300,
    },
  ],
  nodeOverrides: [],
};

const nodes: ResourceNodeDefinition[] = [
  {
    id: "tree_a",
    kind: "tree",
    title: "Tree A",
    skillId: "woodcutting",
    requiredLevel: 1,
    xpReward: 25,
    itemRewardId: "wood_log",
    itemRewardName: "Wood Log",
    respawnTicks: 10,
    position: { x: 0, y: 0 },
    radius: 10,
  },
  {
    id: "ore_b",
    kind: "ore",
    title: "Ore B",
    skillId: "mining",
    requiredLevel: 1,
    xpReward: 35,
    itemRewardId: "copper_ore",
    itemRewardName: "Copper Ore",
    respawnTicks: 10,
    position: { x: 10, y: 0 },
    radius: 10,
  },
  {
    id: "fish_c",
    kind: "fish_spot",
    title: "Fish C",
    skillId: "fishing",
    requiredLevel: 1,
    xpReward: 20,
    itemRewardId: "raw_fish",
    itemRewardName: "Raw Fish",
    respawnTicks: 10,
    position: { x: 20, y: 0 },
    radius: 10,
  },
];

function createService(config: ResourceEcologyConfig = baseConfig): ResourceEcologyService {
  const service = new ResourceEcologyService(config);
  service.registerNodes(nodes);
  return service;
}

function configWithTreeInitialStock(initialStock: number): ResourceEcologyConfig {
  return {
    ...baseConfig,
    kindRules: baseConfig.kindRules.map((rule) =>
      rule.kind === "tree" ? { ...rule, initialStock } : rule,
    ),
  };
}

describe("ResourceEcology runtime", () => {
  it("replays deterministically for the same tick and extraction inputs", () => {
    const a = createService();
    const b = createService();

    a.applyExtraction({ nodeId: "tree_a", currentTick: 10 });
    b.applyExtraction({ nodeId: "tree_a", currentTick: 10 });

    const snapshotsA = a.tick(20);
    const snapshotsB = b.tick(20);

    expect(snapshotsA).toEqual(snapshotsB);
    expect(a.getNodeSnapshot("tree_a", 20)?.hash).toBe(b.getNodeSnapshot("tree_a", 20)?.hash);
  });

  it("applies successful extraction as lower stock and deterministic pressure", () => {
    const service = createService();

    const after = service.applyExtraction({ nodeId: "tree_a", currentTick: 5 });

    expect(after?.currentStock).toBe(2000);
    expect(after?.extractionPressurePermille).toBe(200);
    expect(after?.extractionCount).toBe(1);

    const advanced = service.getNodeSnapshot("tree_a", 7);
    expect(advanced?.extractionPressurePermille).toBe(100);
    expect(advanced?.currentStock).toBe(2180);
  });

  it("uses collapse threshold to reduce regeneration", () => {
    const collapsed = createService(configWithTreeInitialStock(1000));
    const healthy = createService(configWithTreeInitialStock(2000));

    const collapsedSnapshot = collapsed.getNodeSnapshot("tree_a", 10);
    const healthySnapshot = healthy.getNodeSnapshot("tree_a", 10);

    expect(collapsedSnapshot?.collapseActive).toBe(true);
    expect(collapsedSnapshot?.currentStock).toBe(1250);
    expect(healthySnapshot?.collapseActive).toBe(false);
    expect(healthySnapshot?.currentStock).toBe(3000);
  });

  it("keeps stock inside zero and capacity bounds", () => {
    const service = createService();

    service.applyExtraction({ nodeId: "tree_a", currentTick: 1 });
    service.applyExtraction({ nodeId: "tree_a", currentTick: 1 });
    service.applyExtraction({ nodeId: "tree_a", currentTick: 1 });
    service.applyExtraction({ nodeId: "tree_a", currentTick: 1 });

    const empty = service.getNodeSnapshot("tree_a", 1);
    expect(empty?.currentStock).toBe(0);
    expect(empty?.status).toBe("empty");

    const regenerated = service.getNodeSnapshot("tree_a", 10_000);
    expect(regenerated?.currentStock).toBeGreaterThanOrEqual(0);
    expect(regenerated?.currentStock).toBeLessThanOrEqual(3000);
  });

  it("sorts snapshots by node id", () => {
    const service = new ResourceEcologyService(baseConfig);
    service.registerNode(nodes[1]);
    service.registerNode(nodes[2]);
    service.registerNode(nodes[0]);

    expect(service.listSnapshots(0).map((snapshot) => snapshot.nodeId)).toEqual([
      "fish_c",
      "ore_b",
      "tree_a",
    ]);
  });

  it("runs through the resource-economy tick system cadence", () => {
    const service = createService();
    const system = new ResourceEcologyTickSystem(service);

    service.applyExtraction({ nodeId: "tree_a", currentTick: 1 });
    system.tick(createDefaultTickContext(5));

    expect(service.getNodeSnapshot("tree_a", 5)?.lastTick).toBe(5);
  });

  it("projects ecology snapshots onto resource node snapshots", () => {
    const service = createService();
    const resourceSnapshots: ResourceNodeSnapshot[] = nodes.map((node) => ({
      id: node.id,
      kind: node.kind,
      title: node.title,
      skillId: node.skillId,
      requiredLevel: node.requiredLevel,
      xpReward: node.xpReward,
      itemRewardId: node.itemRewardId,
      itemRewardName: node.itemRewardName,
      position: node.position,
      radius: node.radius,
      status: "available",
      depletedUntilTick: null,
      remainingTicks: 0,
      requiredTool: node.requiredTool,
    }));

    service.applyExtraction({ nodeId: "tree_a", currentTick: 1, units: 3000 });
    const ecologySnapshots = service.listSnapshots(1);
    const projected = attachResourceEcologySnapshots(resourceSnapshots, ecologySnapshots);

    expect(projected.find((snapshot) => snapshot.id === "tree_a")?.status).toBe("depleted");
    expect(projected.find((snapshot) => snapshot.id === "tree_a")?.ecology?.currentStock).toBe(0);
  });
});
