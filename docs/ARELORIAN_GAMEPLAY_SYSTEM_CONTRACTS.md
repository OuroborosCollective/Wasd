# Arelorian gameplay system contracts

This page captures practical rules for current gameplay systems.

## Live panels

Panels should use real snapshots where possible.

Each panel should clearly support:

- waiting
- live
- empty
- stale
- error

Preview data must not be presented as live state.

## Resource loop

The early game loop is:

```text
gather -> process -> sell -> earn -> equip -> improve
```

Known processing examples:

- wood log to wood plank near a workbench
- copper ore to copper ingot near a furnace
- raw fish to cooked fish near a campfire

Selling should happen near a valid village trader and should be checked by the server.

## Loot and equipment

Loot should remain deterministic and server-authoritative.

Useful equipment stat keys include:

- attack power
- defense
- max health
- magic find
- gathering bonus
- stamina bonus

Useful equipment slots include:

- weapon
- armor
- helmet
- boots
- ring
- amulet

Gameplay effects should come from server-approved equipment state, not local UI guesses.

## Resource Economy Loop (2026-06-09)

The live resource economy loop is the primary gameplay loop for early game progression:

```text
gather -> process -> sell -> earn -> equip -> improve
```

### Resources

| Resource ID | Type | Gathered From | Sell Price |
|-------------|------|--------------|------------|
| `wood_log` | Raw | Tree nodes | 1 coin |
| `copper_ore` | Raw | Ore nodes | 3 coins |
| `raw_fish` | Raw | Fish spots | 2 coins |

### Processing Recipes

| Recipe | Input | Output | Station |
|--------|-------|--------|---------|
| `craft_wood_plank` | 2x wood_log | 1x wood_plank (3 coins) | workbench |
| `smelt_copper_ingot` | 2x copper_ore | 1x copper_ingot (8 coins) | furnace |
| `cook_raw_fish` | 1x raw_fish | 1x cooked_fish (4 coins) | campfire |

### Vendor

- `village_trader_001` - Mira the Quartermaster (462, 503)
- Interaction radius: 32
- Processed resources sell for premium prices

### Equipment Stats Integration

- `gatheringYield` - Bonus yield quantity from equipment
- `gatheringXp` - XP multiplier from equipment
- Tier 2 tools provide +1 bonus yield

### API Endpoints

- `POST /api/resource/gather` - Gather from resource node
- `POST /api/crafting/craft` - Process/craft at station
- `POST /api/economy/sell-resource` - Sell to vendor
- `POST /api/economy/sell-all-resources` - Sell all resources

See `docs/RESOURCE_ECONOMY_LOOP.md` for full documentation.

## NPC and world feel

NPCs should visibly move, respond, and offer working choices. The outside world should render clearly beyond the village.

Important checks:

- NPC wandering is visible.
- dialogue choices are handled.
- terrain order is correct for the isometric view.
- chunks outside the village are not visually empty when they contain world data.

## Review rule

For gameplay work, use this chain:

```text
client intent -> server validation -> server mutation -> snapshot or event -> client render
```

If a feature skips server validation, it is not ready.
