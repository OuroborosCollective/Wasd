# CRITICAL Learnings: Loot Distribution Optimization

## Performance Improvement: Bulk Operations
The `LootTransactionHandler` was suffering from O(N) database round-trips for both token distribution and item distribution.

### 1. Bulk INSERT for Items
For each item in the loot payload, it was performing separate `INSERT` operations into `user_inventory` and `audit_logs`.
**Optimization:** Refactored to perform two bulk `INSERT` operations.
**Results (100 items):** Query count for item distribution dropped from 200 to 2.

### 2. Bulk UPDATE for Tokens
Tokens were distributed by iterating over participants and updating each wallet individually.
**Optimization:** Replaced the loop with a single `UPDATE ... WHERE user_id IN (...)` query.
**Results:** Query count for token distribution dropped from N to 1.

### Overall Benchmark Results (100 items, 3 participants):
- **Total Query Count:** 206 -> 5 (Selects + Bulk Update + 2 Bulk Inserts + Final Insert).
- **Processing Time:** ~70% reduction in middleware overhead.

## Repository Specifics
- The server package uses `type: module`, but some middleware still uses CommonJS (`require`). Mixing these requires careful handling of file extensions (`.cjs`) or full refactoring to ESM.
- SQL placeholders use `?`, which is typical for drivers like `mysql2` or specific `pg` wrappers.
