# Gathering Momentum Rewards

## Runtime truth path

`game-data/resources/gathering-momentum.json` is now the gameplay data source for the gathering momentum rule.

Runtime path:

```text
game-data/resources/gathering-momentum.json
  -> server/src/resources/ResourceGameData.ts
  -> ResourceNodeStore.gather()
  -> GatherResourceResult.momentum
  -> GatheringService skill_xp_gain
```

This is not a cosmetic document flag. The rule is loaded from the active content root and applied only after a server-authoritative successful gather.

## Player value

Gathering now has a small deterministic progression loop:

```text
first successful gather: base XP
same skill within 600 ticks: +50 permille XP
same skill chain keeps rising
cap: streak 5
skill change or expired tick window: reset
```

At the current starter tree value of `25` XP:

```text
streak 1 = 25 XP
streak 2 = 26 XP
streak 3 = 27 XP
streak 4 = 28 XP
streak 5 = 30 XP
```

The integer rounding is deterministic:

```text
floor(baseXp * (1000 + bonusPermille) / 1000)
```

## ARE constraints

The rule depends only on:

```text
playerId
skillId
currentTick
successful gather order
game-data rule values
```

Forbidden sources:

```text
Date.now
Math.random
wall-clock windows
client-authoritative XP
fake snapshot values
```

Failed gathers do not advance momentum.

## Game-data additions

Resource starter nodes now exist in:

```text
game-data/resources/resource-nodes.json
```

The content manifest now communicates the gameplay truth id:

```text
gameplayTruthIds: ["gathering_momentum_v1"]
truthStatus.gathering_momentum_v1: "runtime_truth"
```

The momentum data itself includes the promotion communication:

```text
canBecomeTruth: true
truthPath: "game-data/resources/gathering-momentum.json -> server/src/resources/ResourceGameData.ts -> ResourceNodeStore.gather() -> skill_xp_gain"
```

## Tests

Covered in `server/src/tests/resource-node-store.test.ts`:

```text
same-skill momentum inside tick window
skill change resets momentum
expired tick window resets momentum
deterministic replay of the same gather sequence
clearForTests resets momentum state
```
