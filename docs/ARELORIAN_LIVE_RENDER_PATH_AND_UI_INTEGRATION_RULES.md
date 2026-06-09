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

## Real /2d boot path on VPS

The expected post-login path on VPS:

```
/2d
  -> login gate (CyberZenLoginGate)
  -> entered state
  -> deterministic world root (DeterministicWorldIsoApp)
    OR recoverable boot diagnostic (BootSurface)
  -> HUD shell (ArelorianStitchHud)
  -> dock/menu
  -> character select or paperdoll surface
```

### Required visible post-login surfaces

After login, the player must always see one of:

1. **World root** (`data-testid="deterministic-world-root"`) - Pixi world is live
2. **Boot diagnostic** (`data-testid="client-2d-boot-diagnostic"`) - Renderer degraded/error but UI shell is alive
3. **HUD shell** (`data-testid="arelorian-stitch-hud"` or `.stitch-hud`) - HUD overlay is present

### BootState type

The `BootSurface` component provides explicit boot states:

```typescript
export type BootState =
  | "waiting"      // Initial state before boot starts
  | "initializing" // Renderer is being set up
  | "ready"        // Renderer is fully initialized
  | "degraded"     // Renderer partially initialized
  | "error";       // Renderer failed to initialize
```

### Degraded diagnostic behavior

When the world renderer fails to boot:

1. The `BootSurface` component shows a diagnostic overlay
2. The UI shell (HUD, menus) remains visible
3. A reload button is provided for recovery
4. The error details are displayed for debugging

```tsx
<BootSurface
  bootState={bootState}
  error={worldBootError}
  diagnosticMessage="The world renderer failed to initialize."
>
  <div className="az-shell" data-testid="deterministic-world-root">
    {/* World content */}
  </div>
</BootSurface>
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

## E2E smoke test name

The boot path is validated by:

```
e2e/client-2d-boot-smoke.spec.ts
  -> "client-2d post-login boot path shows a stable surface"
```

This test verifies:
- Login gate or post-login state is visible
- World root, boot diagnostic, or HUD shell appears
- HUD shell is visible after login
- No critical page errors

## Review question

Before merge, ask:

```text
Can a tester prove this UI is visible in the real client without opening source files?
```

If not, the integration is incomplete.

## Rule: UI is not done until visible in real runtime path

A component is only considered complete when:

1. It is imported by the active app entry point
2. It renders visible output after login in the real browser
3. It has a stable `data-testid` attribute for testability
4. It has error/loading fallbacks that don't cause blank screens
5. An E2E or integration test verifies it renders in the real path
