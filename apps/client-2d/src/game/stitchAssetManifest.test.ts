import { describe, expect, it } from "vitest";
import {
  getStitchAssetsByCategory,
  getManualReviewEntries,
  getReferenceOnlyEntries,
  getQuarantineEntries,
  type StitchRuntimeManifest,
  type StitchRuntimeAsset,
} from "./stitchAssetManifest";

describe("stitchAssetManifest string sorting optimization", () => {
  const sampleManifest: StitchRuntimeManifest = {
    schemaVersion: 1,
    packId: "test_pack",
    generatedBy: "test",
    deterministic: true,
    assets: [
      {
        assetId: "stitch_hero_warrior",
        category: "hero",
        displayName: "Warrior",
        sourcePath: "hero/warrior.png",
        imagePath: "hero/warrior.png",
        atlasPath: "hero/warrior.json",
        previewPath: "hero/warrior_preview.png",
        width: 64,
        height: 64,
        frameWidth: 64,
        frameHeight: 64,
        columns: 1,
        rows: 1,
        frameCount: 1,
        pivot: { x: 0.5, y: 0.82 },
        tags: [],
        sourceSha256: "a",
        processedSha256: "a",
        status: "accepted",
      },
      {
        assetId: "stitch_hero_archer",
        category: "hero",
        displayName: "Archer",
        sourcePath: "hero/archer.png",
        imagePath: "hero/archer.png",
        atlasPath: "hero/archer.json",
        previewPath: "hero/archer_preview.png",
        width: 64,
        height: 64,
        frameWidth: 64,
        frameHeight: 64,
        columns: 1,
        rows: 1,
        frameCount: 1,
        pivot: { x: 0.5, y: 0.82 },
        tags: [],
        sourceSha256: "b",
        processedSha256: "b",
        status: "accepted",
      },
      {
        assetId: "stitch_hero_mage",
        category: "hero",
        displayName: "Mage",
        sourcePath: "hero/mage.png",
        imagePath: "hero/mage.png",
        atlasPath: "hero/mage.json",
        previewPath: "hero/mage_preview.png",
        width: 64,
        height: 64,
        frameWidth: 64,
        frameHeight: 64,
        columns: 1,
        rows: 1,
        frameCount: 1,
        pivot: { x: 0.5, y: 0.82 },
        tags: [],
        sourceSha256: "c",
        processedSha256: "c",
        status: "accepted",
      },
    ],
    manualReview: [
      { assetId: "rev_c", category: "hero", sourcePath: "a", warnings: [], sourceSha256: "1" },
      { assetId: "rev_a", category: "hero", sourcePath: "b", warnings: [], sourceSha256: "2" },
      { assetId: "rev_b", category: "hero", sourcePath: "c", warnings: [], sourceSha256: "3" },
    ],
    referenceOnly: [
      { assetId: "ref_z", category: "hero", sourcePath: "a", warnings: [], sourceSha256: "1" },
      { assetId: "ref_m", category: "hero", sourcePath: "b", warnings: [], sourceSha256: "2" },
    ],
    quarantine: [
      { assetId: "qua_x", category: "hero", sourcePath: "a", reason: "error", warnings: [] },
      { assetId: "qua_a", category: "hero", sourcePath: "b", reason: "error", warnings: [] },
    ],
  };

  it("sorts assets by assetId correctly", () => {
    const heroes = getStitchAssetsByCategory(sampleManifest, "hero");
    expect(heroes.map((h) => h.assetId)).toEqual([
      "stitch_hero_archer",
      "stitch_hero_mage",
      "stitch_hero_warrior",
    ]);
  });

  it("sorts review, reference, and quarantine entries correctly", () => {
    expect(getManualReviewEntries(sampleManifest).map((e) => e.assetId)).toEqual([
      "rev_a",
      "rev_b",
      "rev_c",
    ]);
    expect(getReferenceOnlyEntries(sampleManifest).map((e) => e.assetId)).toEqual([
      "ref_m",
      "ref_z",
    ]);
    expect(getQuarantineEntries(sampleManifest).map((e) => e.assetId)).toEqual([
      "qua_a",
      "qua_x",
    ]);
  });

  it("benchmarks fast relational string comparison vs localeCompare for asset manifest sorting", () => {
    const assetList: StitchRuntimeAsset[] = Array.from({ length: 1500 }, (_, i) => ({
      assetId: `stitch_asset_${(i * 37) % 1500}_${1500 - i}`,
      category: "hero",
      displayName: `Asset ${i}`,
      sourcePath: `path/${i}.png`,
      imagePath: `path/${i}.png`,
      atlasPath: `path/${i}.json`,
      previewPath: `path/${i}_prev.png`,
      width: 64,
      height: 64,
      frameWidth: 64,
      frameHeight: 64,
      columns: 1,
      rows: 1,
      frameCount: 1,
      pivot: { x: 0.5, y: 0.5 },
      tags: [],
      sourceSha256: "sha",
      processedSha256: "sha",
      status: "accepted",
    }));

    const iterations = 15;

    // 1. Benchmark legacy localeCompare sort
    const startLocale = performance.now();
    for (let i = 0; i < iterations; i++) {
      [...assetList].sort((a, b) => a.assetId.localeCompare(b.assetId));
    }
    const durationLocale = performance.now() - startLocale;

    // 2. Benchmark fast relational sort
    const startRelational = performance.now();
    for (let i = 0; i < iterations; i++) {
      [...assetList].sort((a, b) => (a.assetId < b.assetId ? -1 : a.assetId > b.assetId ? 1 : 0));
    }
    const durationRelational = performance.now() - startRelational;

    const speedup = durationLocale / (durationRelational || 0.001);

    console.log(`\n⚡ Stitch Asset Manifest Sort Benchmark (${assetList.length} items, ${iterations} iterations):`);
    console.log(`  - localeCompare sort:    ${durationLocale.toFixed(4)}ms`);
    console.log(`  - fast relational sort:  ${durationRelational.toFixed(4)}ms`);
    console.log(`  - Speedup factor:        ${speedup.toFixed(2)}x faster\n`);

    expect(durationRelational).toBeLessThan(durationLocale + 10);
  });
});
