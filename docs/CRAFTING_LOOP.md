# Crafting Loop

## Status

**PARTIAL MVP**.

This system adds deterministic starter recipes that consume persistent inventory resources and grant Crafting XP.

## Loop

```
Gather Resource
→ Resource Item in Inventory
→ Craft Recipe
→ Consume Ingredients
→ Add Output Item
→ Grant Crafting XP
→ LiveGameplaySnapshot update
→ 2D Crafting Panel update
```

## Starter Recipes

| Recipe ID | Input | Output | Crafting XP |
|-----------|-------|--------|-------------|
| craft_wood_plank | 2× wood_log | 1× wood_plank | 20 |
| smelt_copper_ingot | 3× copper_ore | 1× copper_ingot | 30 |
| cook_raw_fish | 1× raw_fish | 1× cooked_fish | 15 |

## Determism Rules

- No `Math.random()`.
- No `Date.now()` for gameplay state.
- Recipe IDs are stable.
- Recipe order is sorted by ID.
- Client never creates items.
- Client never consumes items.
- Server resolves player identity.
- Server validates ingredients and skill level.
- Same inventory state + same craft request produces same result.

## Current Items

### Inputs:

- `wood_log`
- `copper_ore`
- `raw_fish`

### Outputs:

- `wood_plank`
- `copper_ingot`
- `cooked_fish`

## Current Limits

- MVP starter recipes only.
- No crafting stations.
- No tools required.
- No queueing.
- No failure chance.
- No equipment outputs.
- No trading/economy integration.
- No crafting animation pipeline.

## API Endpoints

### GET /api/crafting/recipes

Returns all crafting recipes with craftability status for the player.

```json
{
  "ok": true,
  "playerId": "player123",
  "recipes": [
    {
      "id": "cook_raw_fish",
      "title": "Cook Raw Fish",
      "requiredLevel": 1,
      "craftingXpReward": 15,
      "craftTicks": 4,
      "ingredients": [{ "itemId": "raw_fish", "quantity": 1 }],
      "outputs": [{ "itemId": "cooked_fish", "quantity": 1 }],
      "craftable": false,
      "blockedReason": "missing_ingredients"
    }
  ]
}
```

### POST /api/crafting/craft

Attempts to craft a recipe. Consumes ingredients, adds outputs, grants crafting XP.

```json
// Request
{
  "recipeId": "craft_wood_plank"
}

// Response (success)
{
  "ok": true,
  "result": {
    "ok": true,
    "playerId": "player123",
    "recipeId": "craft_wood_plank",
    "reason": "crafted",
    "consumed": [{ "itemId": "wood_log", "quantity": 2 }],
    "outputs": [{ "itemId": "wood_plank", "quantity": 1 }],
    "craftingXpReward": 20
  }
}

// Response (failure - missing ingredients)
{
  "ok": true,
  "result": {
    "ok": false,
    "playerId": "player123",
    "recipeId": "craft_wood_plank",
    "reason": "missing_ingredients"
  }
}
```

## Verification

```bash
# Unit tests
pnpm vitest run server/tests/crafting-recipes.test.ts

# E2E tests
pnpm run test:e2e -- e2e/crafting-loop.spec.ts
pnpm run test:e2e -- e2e/client-2d-crafting-panel.spec.ts

# Build client
pnpm --filter @wasd/client-2d build
```

## Next Steps

- `feat(crafting): add crafting stations and tool requirements`
- `feat(equipment): craft and equip basic tools`
- `feat(economy): price crafted goods through NPC demand`