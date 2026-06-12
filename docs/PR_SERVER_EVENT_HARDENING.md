# Server Event Hardening

This branch wires the server-side living-world event path to chat and proves the 2D client can render incoming chat packets.

```text
WorldTickThinShell
→ sharedWorldEventBus
→ OracleTickSystem
→ OracleChatBridge
→ ChatChannelRouter
→ WebSocket broadcast
→ client-2d chat sidecar
```

The chat path is side-channel only and does not create gameplay state.
