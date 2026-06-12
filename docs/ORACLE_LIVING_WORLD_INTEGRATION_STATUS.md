# Living World Server Integration Status

## What this branch wires

```text
WorldTickThinShell
→ shared WorldEventBus
→ OracleTickSystem
→ OracleChatBridge
→ ChatChannelRouter
→ GameWebSocketServer
→ client-2d chat sidecar
```

## Safety rules

```text
- Oracle events are side-channel events.
- Chat rendering does not mutate gameplay state.
- Cooldowns use deterministic event ticks instead of wall-clock time.
- WorldTickThinShell stores a real world-state provider instead of logging a stub.
```

## Client proof

`e2e/client2d-chat-feed.spec.ts` dispatches a `chat_message` network packet into `/2d` and asserts that the live chat HUD renders it.

## Notes

The 2D chat HUD is mounted through the already-imported `client2dBootstrapNpcOverlay.ts` sidecar. This avoided a large `main.tsx` replacement and keeps the public HUD change focused.
