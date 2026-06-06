# Equipment: Gathering Tools

## Status

PARTIAL MVP.

This system adds basic equippable gathering tools crafted from persistent inventory items.

## Loop

```
Gather Resources
→ Craft Wood Plank / Copper Ingot
→ Craft Gathering Tool
→ Equip Tool
→ Tool appears in LiveGameplaySnapshot
→ Gathering receives deterministic tool bonus
```

## Tools

| Item | Slot | Bonus |
|------|------|-------|
| wooden_axe | woodcutting_tool | 10% woodcutting XP bonus |
| copper_pickaxe | mining_tool | 10% mining XP bonus |
| simple_fishing_rod | fishing_tool | 10% fishing XP bonus |

## Recipes

| Recipe | Ingredients | Output |
|--------|-------------|--------|
| craft_wooden_axe | 2 Wood Plank + 1 Copper Ingot | Wooden Axe |
| craft_copper_pickaxe | 1 Wood Plank + 2 Copper Ingot | Copper Pickaxe |
| craft_simple_fishing_rod | 1 Wood Plank + 1 Raw Fish | Simple Fishing Rod |

## Determinism

- No random tool stats.
- No durability decay.
- No random equip outcome.
- Stable item IDs.
- Stable slot IDs.
- Server validates ownership.
- Client cannot equip unowned tools.
- XP multiplier uses fixed permille math (1000 = 100%).

## Current Limits

- No durability.
- No tool tiers beyond starter tools.
- No combat equipment.
- No armor.
- No equipment trading.
- No visual paperdoll yet.
- Tool bonus is deterministic and small.

## API Endpoints

- `GET /api/equipment/state` - Get player equipment
- `POST /api/equipment/equip` - Equip item from inventory

## Entry Points

- `server/src/equipment/EquipmentTypes.ts`
- `server/src/equipment/EquipmentStore.ts`
- `server/src/equipment/EquipmentService.ts`
- `server/src/equipment/EquipmentBonus.ts`
- `server/src/routes/equipmentRoute.ts`
- `apps/client-2d/src/ui/windows/InventoryPanel.tsx`