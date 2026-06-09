# Arelorian current project state - 2026-06

## Current spine

```text
/2d
  -> login
  -> 2D world
  -> HUD
  -> character and paperdoll
  -> gather resources
  -> process resources
  -> sell to village trader
  -> earn coins
  -> generate loot
  -> equip items
  -> show stats in gameplay panels
```

## Strongest current direction

The project is no longer only architecture. It is becoming a playable 2D MMORPG loop.

The most important loop is:

```text
enter world -> gather -> process -> sell -> equip -> improve
```

## Partial areas to finish

- Character and paperdoll exist, but need stronger live UI polish.
- Inventory and equipment need clear server-backed interaction.
- Quest, guild, faction, and map panels need deeper persistent data.
- Processing stations need visible world placement and validation.
- Asset classification must prevent label art from appearing as world decoration.
- The `/2d` boot path needs continued smoke testing.

## Priority order

1. Keep `/2d` reliable.
2. Keep HUD and diagnostics visible after login.
3. Finish gather, process, sell, equip.
4. Make loot stats visible and useful.
5. Turn snapshot panels into deeper gameplay systems.
6. Add tests for fail-closed rules.

## Rule

A feature is not done because a file exists. It is done when the real runtime path renders it, the server validates it, and a test or smoke check can catch regressions.
