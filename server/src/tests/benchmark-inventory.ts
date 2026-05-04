// @ts-nocheck

function originalApproach(inventory: any[], requiredItemId: string, requiredCount: number) {
  const count = inventory.filter((item: any) => item.id === requiredItemId).length;
  if (count >= (requiredCount || 1)) {
    for (let i = 0; i < (requiredCount || 1); i++) {
      const index = inventory.findIndex((item: any) => item.id === requiredItemId);
      if (index !== -1) inventory.splice(index, 1);
    }
    return true;
  }
  return false;
}

function optimizedApproach(inventory: any[], requiredItemId: string, requiredCount: number) {
  let count = 0;
  const reqCount = requiredCount || 1;
  // First pass to count
  for (let i = inventory.length - 1; i >= 0; i--) {
    if (inventory[i].id === requiredItemId) {
      count++;
    }
  }

  if (count >= reqCount) {
    let removed = 0;
    for (let i = inventory.length - 1; i >= 0 && removed < reqCount; i--) {
      if (inventory[i].id === requiredItemId) {
        inventory.splice(i, 1);
        removed++;
      }
    }
    return true;
  }
  return false;
}

// Even more optimized approach (single pass if possible, though we need to check count first)
function singlePassOptimizedApproach(inventory: any[], requiredItemId: string, requiredCount: number) {
  const reqCount = requiredCount || 1;
  const indices: number[] = [];
  for (let i = inventory.length - 1; i >= 0; i--) {
    if (inventory[i].id === requiredItemId) {
      indices.push(i);
    }
  }

  if (indices.length >= reqCount) {
    for (let i = 0; i < reqCount; i++) {
      inventory.splice(indices[i], 1);
    }
    return true;
  }
  return false;
}

// Note: splicing in a loop while iterating forward is dangerous, but indices were collected backwards.
// Wait, if I splice at indices[0] (which is the largest index), it doesn't affect the other indices because they are smaller.
// So the backward collection + forward splicing (from largest to smallest index) is safe.

const ITERATIONS = 10000;
const INVENTORY_SIZE = 100;
const REQUIRED_COUNT = 5;
const ITEM_ID = "wood";

function generateInventory() {
  const inv = [];
  for (let i = 0; i < INVENTORY_SIZE; i++) {
    inv.push({ id: i % 10 === 0 ? ITEM_ID : "other" });
  }
  return inv;
}

console.log("Starting benchmark...");

// Benchmark original
let start = Date.now();
for (let i = 0; i < ITERATIONS; i++) {
  const inv = generateInventory();
  originalApproach(inv, ITEM_ID, REQUIRED_COUNT);
}
console.log(`Original approach: ${Date.now() - start}ms`);

// Benchmark optimized (two passes)
start = Date.now();
for (let i = 0; i < ITERATIONS; i++) {
  const inv = generateInventory();
  optimizedApproach(inv, ITEM_ID, REQUIRED_COUNT);
}
console.log(`Optimized approach (two passes): ${Date.now() - start}ms`);

// Benchmark single pass (indices)
start = Date.now();
for (let i = 0; i < ITERATIONS; i++) {
  const inv = generateInventory();
  singlePassOptimizedApproach(inv, ITEM_ID, REQUIRED_COUNT);
}
console.log(`Single pass approach (indices): ${Date.now() - start}ms`);
