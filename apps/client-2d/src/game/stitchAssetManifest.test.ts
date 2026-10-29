import { describe, expect, it } from "vitest";
import {
  getStitchAssetsByCategory,
  getManualReviewEntries,
  getReferenceOnlyEntries,
  getQuarantineEntries,
  type StitchRuntimeManifest,
  type StitchRuntimeAsset,
} from "./stitchAssetManifest";
import { Client2DVisualTimerBus } from "../client2dPixiModules";

const mockManifest: StitchRuntimeManifest = {
  schemaVersion: 1,
  packId: "test_pack",
  generatedBy: "test",
  deterministic: true,
  assets: [
    {
      assetId: "stitch_hero_warrior",
      category: "hero",
      displayName: "Warrior",
      sourcePath: "src/hero1",
      imagePath: "img/hero1.png",
      atlasPath: "atlas/hero1.json",
      previewPath: "prev/hero1.png",
      width: 64,
      height: 64,
      frameWidth: 32,
      frameHeight: 32,
      columns: 2,
      rows: 2,
      frameCount: 4,
      pivot: { x: 0.5, y: 0.82 },
      tags: ["hero"],
      sourceSha256: "hash1",
      processedSha256: "hash2",
      status: "accepted",
    },
    {
      assetId: "stitch_hero_archer",
      category: "hero",
      displayName: "Archer",
      sourcePath: "src/hero2",
      imagePath: "img/hero2.png",
      atlasPath: "atlas/hero2.json",
      previewPath: "prev/hero2.png",
      width: 64,
      height: 64,
      frameWidth: 32,
      frameHeight: 32,
      columns: 2,
      rows: 2,
      frameCount: 4,
      pivot: { x: 0.5, y: 0.82 },
      tags: ["hero"],
      sourceSha256: "hash3",
      processedSha256: "hash4",
      status: "accepted",
    },
    {
      assetId: "stitch_hero_mage",
      category: "hero",
      displayName: "Mage",
      sourcePath: "src/hero3",
      imagePath: "img/hero3.png",
      atlasPath: "atlas/hero3.json",
      previewPath: "prev/hero3.png",
      width: 64,
      height: 64,
      frameWidth: 32,
      frameHeight: 32,
      columns: 2,
      rows: 2,
      frameCount: 4,
      pivot: { x: 0.5, y: 0.82 },
      tags: ["hero"],
      sourceSha256: "hash5",
      processedSha256: "hash6",
      status: "accepted",
    },
  ],
  manualReview: [
    { assetId: "rev_beta", category: "prop", sourcePath: "p1", warnings: [], sourceSha256: "h1" },
    { assetId: "rev_alpha", category: "prop", sourcePath: "p2", warnings: [], sourceSha256: "h2" },
  ],
  referenceOnly: [
    { assetId: "ref_z", category: "vfx", sourcePath: "v1", warnings: [], sourceSha256: "h3" },
    { assetId: "ref_a", category: "vfx", sourcePath: "v2", warnings: [], sourceSha256: "h4" },
  ],
  quarantine: [
    { assetId: "q_2", sourcePath: "q1", reason: "bad", warnings: [] },
    { assetId: "q_1", sourcePath: "q2", reason: "bad", warnings: [] },
  ],
};

describe("stitchAssetManifest & client2dPixiModules performance & correctness", () => {
  it("correctly filters and sorts assets by category deterministically", () => {
    const heroes = getStitchAssetsByCategory(mockManifest, "hero");
    expect(heroes.map((h) => h.assetId)).toEqual([
      "stitch_hero_archer",
      "stitch_hero_mage",
      "stitch_hero_warrior",
    ]);
  });

  it("correctly sorts review, reference, and quarantine entries deterministically", () => {
    expect(getManualReviewEntries(mockManifest).map((e) => e.assetId)).toEqual(["rev_alpha", "rev_beta"]);
    expect(getReferenceOnlyEntries(mockManifest).map((e) => e.assetId)).toEqual(["ref_a", "ref_z"]);
    expect(getQuarantineEntries(mockManifest).map((e) => e.assetId)).toEqual(["q_1", "q_2"]);
  });

  it("schedules visual timers and orders them by dueAt and id correctly", () => {
    const bus = new Client2DVisualTimerBus();
    const executed: string[] = [];

    bus.schedule("timer_b", 100, () => executed.push("timer_b"));
    bus.schedule("timer_a", 100, () => executed.push("timer_a"));
    bus.schedule("timer_first", 50, () => executed.push("first"));

    bus.update(150);

    expect(executed).toEqual(["first", "timer_a", "timer_b"]);
  });

  it("benchmarks fast relational comparison vs localeCompare for manifest asset sorting", () => {
    const generateSampleAssets = (count: number): StitchRuntimeAsset[] => {
      const categories = ["hero", "enemy", "boss", "prop", "vfx", "tile"] as const;
      return Array.from({ length: count }, (_, i) => ({
        assetId: `stitch_${categories[i % categories.length]}_sample_asset_${(count - i).toString().padStart(6, "0")}`,
        category: categories[i % categories.length]!,
        displayName: `Sample Asset ${i}`,
        sourcePath: `src/path_${i}`,
        imagePath: `img/path_${i}.png`,
        atlasPath: `atlas/path_${i}.json`,
        previewPath: `prev/path_${i}.png`,
        width: 64,
        height: 64,
        frameWidth: 32,
        frameHeight: 32,
        columns: 2,
        rows: 2,
        frameCount: 4,
        pivot: { x: 0.5, y: 0.5 },
        tags: [],
        sourceSha256: `sha_${i}`,
        processedSha256: `psha_${i}`,
        status: "accepted",
      }));
    };

    const sampleAssets = generateSampleAssets(1000);
    const iterations = 50;

    // 1. Benchmark localeCompare sort
    const startLocale = performance.now();
    for (let i = 0; i < iterations; i++) {
      [...sampleAssets].sort((a, b) => a.assetId.localeCompare(b.assetId));
    }
    const durationLocale = performance.now() - startLocale;

    // 2. Benchmark fast relational sort
    const startRelational = performance.now();
    for (let i = 0; i < iterations; i++) {
      [...sampleAssets].sort((a, b) => (a.assetId < b.assetId ? -1 : a.assetId > b.assetId ? 1 : 0));
    }
    const durationRelational = performance.now() - startRelational;

    const speedup = durationLocale / (durationRelational || 0.001);

    console.log(`\n⚡ Stitch Asset Manifest Sort Benchmark (1000 assets, ${iterations} iterations):`);
    console.log(`  - localeCompare sort:    ${durationLocale.toFixed(4)}ms`);
    console.log(`  - fast relational sort:  ${durationRelational.toFixed(4)}ms`);
    console.log(`  - Speedup factor:        ${speedup.toFixed(2)}x faster`);

    expect(durationRelational).toBeLessThan(durationLocale);
  });
});
