🎯 **What:**
Created test suite for `server/src/modules/items/AffixSystem.ts` which was lacking proper tests for instantiation and behavior validation.

📊 **Coverage:**
Added test cases for:
- Basic instantiation and verify the `apply()` method exists and does not throw.
- The `rollAffixes` method testing default parameter counts.
- `rollAffixes` testing multiple requests.
- `rollAffixes` testing oversized counts, 0 values, negative counts, and operations on an empty pool.

✨ **Result:**
Increased testing coverage for the items system to ensure more reliable execution when allocating stats to newly generated items. Prevents regressions during refactoring.
