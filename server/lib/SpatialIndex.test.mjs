import assert from "node:assert/strict";
import { SpatialIndex } from "./SpatialIndex.js";

const index = new SpatialIndex(50.1109, 8.6821, { maxChildren: 4 });

for (let i = 0; i < 24; i += 1) {
  index.insert({
    id: `gate_${String(i).padStart(3, "0")}`,
    type: "GPS_ZONE",
    lat: 50.1109 + i * 0.00001,
    lon: 8.6821 + i * 0.00001,
    radius: 50,
  });
}

assert.equal(index.size(), 24);
assert.ok(index.stats().height > 1, "tree should split after maxChildren is exceeded");

const firstQuery = index.queryRadius(50.1109, 8.6821, 80).map((entity) => entity.id);
const secondQuery = index.queryRadius(50.1109, 8.6821, 80).map((entity) => entity.id);

assert.deepEqual(firstQuery, secondQuery, "queries must be deterministic");
assert.ok(firstQuery.includes("gate_000"));

assert.equal(index.update("gate_000", { lat: 50.1200, lon: 8.6900 }), true);
assert.equal(index.queryRadius(50.1109, 8.6821, 20).some((entity) => entity.id === "gate_000"), false);

assert.equal(index.remove("gate_001"), true);
assert.equal(index.size(), 23);

const legacyLngIndex = new SpatialIndex(50.1109, 8.6821);
legacyLngIndex.insert({ id: "legacy_lng", type: "GPS_ZONE", lat: 50.1109, lng: 8.6821 });
assert.equal(legacyLngIndex.nearest(50.1109, 8.6821)[0].id, "legacy_lng");

console.log("SpatialIndex deterministic smoke test passed");
