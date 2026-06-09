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
