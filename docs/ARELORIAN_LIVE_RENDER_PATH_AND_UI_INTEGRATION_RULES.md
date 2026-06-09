# Arelorian live render path and UI integration rules

## Core rule

A UI component is not a feature until it is connected to the real render path.

For current 2D work, start from:

```text
main.tsx
  -> DeterministicWorldIsoApp.tsx
  -> ArelorianStitchHud.tsx
  -> visible panel or world surface
```

## Live path checklist

Before changing a UI feature, verify:

- The component is imported by the active 2D app.
- The component is visible after login.
- The component receives real runtime data or clearly shows an empty state.
- The component has a safe fallback for loading and errors.
- The route can be checked with a smoke test.

## Panel state contract

Every live panel should support these states:

```text
waiting
live
empty
stale
error
```

Do not use preview data as if it were live data.

## Blank screen prevention

The world renderer can fail. The shell must still help the player and developer understand what happened.

Keep these visible where possible:

- world root or diagnostic root
- HUD shell
- menu or dock
- readable error state
- retry or reload path

## Review question

Before merge, ask:

```text
Can a tester prove this UI is visible in the real client without opening source files?
```

If not, the integration is incomplete.
