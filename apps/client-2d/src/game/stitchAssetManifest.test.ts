import { describe, expect, it } from "vitest";
import {
  getStitchAssetsByCategory,
  getManualReviewEntries,
  getReferenceOnlyEntries,
  getQuarantineEntries,
  type StitchRuntimeManifest,
} from "./stitchAssetManifest.js";

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
      sourcePath: "hero/warrior.png",
      imagePath: "hero/warrior.png",
      atlasPath: "hero/warrior.json",
      previewPath: "hero/warrior.png",
      width: 64,
      height: 64,
      frameWidth: 32,
      frameHeight: 32,
      columns: 2,
      rows: 2,
      frameCount: 4,
      pivot: { x: 0.5, y: 0.82 },
      tags: [],
      sourceSha256: "abc",
      processedSha256: "def",
      status: "accepted",
    },
    {
      assetId: "stitch_hero_archer",
      category: "hero",
      displayName: "Archer",
      sourcePath: "hero/archer.png",
      imagePath: "hero/archer.png",
      atlasPath: "hero/archer.json",
      previewPath: "hero/archer.png",
      width: 64,
      height: 64,
      frameWidth: 32,
      frameHeight: 32,
      columns: 2,
      rows: 2,
      frameCount: 4,
      pivot: { x: 0.5, y: 0.82 },
      tags: [],
      sourceSha256: "ghi",
      processedSha256: "jkl",
      status: "accepted",
    },
    {
      assetId: "stitch_hero_mage",
      category: "hero",
      displayName: "Mage",
      sourcePath: "hero/mage.png",
      imagePath: "hero/mage.png",
      atlasPath: "hero/mage.json",
      previewPath: "hero/mage.png",
      width: 64,
      height: 64,
      frameWidth: 32,
      frameHeight: 32,
      columns: 2,
      rows: 2,
      frameCount: 4,
      pivot: { x: 0.5, y: 0.82 },
      tags: [],
      sourceSha256: "mno",
      processedSha256: "pqr",
      status: "accepted",
    },
  ],
  manualReview: [
    { assetId: "review_z", category: "enemy", sourcePath: "z.png", warnings: [], sourceSha256: "1" },
    { assetId: "review_a", category: "enemy", sourcePath: "a.png", warnings: [], sourceSha256: "2" },
  ],
  referenceOnly: [
    { assetId: "ref_b", category: "prop", sourcePath: "b.png", warnings: [], sourceSha256: "3" },
    { assetId: "ref_a", category: "prop", sourcePath: "a.png", warnings: [], sourceSha256: "4" },
  ],
  quarantine: [
    { assetId: "quarantine_y", category: "vfx", sourcePath: "y.png", reason: "corrupt", warnings: [] },
    { assetId: "quarantine_x", category: "vfx", sourcePath: "x.png", reason: "invalid_size", warnings: [] },
  ],
};

describe("StitchAssetManifest sorting & performance", () => {
  it("correctly sorts assets by category using direct relational string comparison", () => {
    const heroAssets = getStitchAssetsByCategory(mockManifest, "hero");
    expect(heroAssets.map((a) => a.assetId)).toEqual([
      "stitch_hero_archer",
      "stitch_hero_mage",
      "stitch_hero_warrior",
    ]);
  });

  it("correctly sorts manualReview, referenceOnly, and quarantine entries", () => {
    expect(getManualReviewEntries(mockManifest).map((e) => e.assetId)).toEqual([
      "review_a",
      "review_z",
    ]);
    expect(getReferenceOnlyEntries(mockManifest).map((e) => e.assetId)).toEqual([
      "ref_a",
      "ref_b",
    ]);
    expect(getQuarantineEntries(mockManifest).map((e) => e.assetId)).toEqual([
      "quarantine_x",
      "quarantine_y",
    ]);
  });

  it("benchmarks direct relational string comparison vs localeCompare for asset sorting", () => {
    const sampleSize = 1000;
    const testAssets = Array.from({ length: sampleSize }, (_, i) => ({
      assetId: `stitch_asset_${(sampleSize - i).toString().padStart(6, "0")}_token_${i % 17}`,
    }));

    const iterations = 500;

    // 1. Benchmark localeCompare sorting
    const startLocale = performance.now();
    for (let i = 0; i < iterations; i++) {
      [...testAssets].sort((a, b) => a.assetId.localeCompare(b.assetId));
    }
    const durationLocale = performance.now() - startLocale;

    // 2. Benchmark direct relational string comparison sorting
    const startRelational = performance.now();
    for (let i = 0; i < iterations; i++) {
      [...testAssets].sort((a, b) => (a.assetId < b.assetId ? -1 : a.assetId > b.assetId ? 1 : 0));
    }
    const durationRelational = performance.now() - startRelational;

    const speedup = durationLocale / (durationRelational || 0.001);

    console.log(`[StitchAssetManifest Sorting Benchmark]`);
    console.log(`  - localeCompare duration:         ${durationLocale.toFixed(2)}ms`);
    console.log(`  - Direct relational duration:     ${durationRelational.toFixed(2)}ms`);
    console.log(`  - Speedup factor:                 ${speedup.toFixed(2)}x faster`);

    expect(durationRelational).toBeLessThan(durationLocale);
  });
});
