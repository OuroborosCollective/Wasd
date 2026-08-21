# Areloria Content Proposals

This directory is a **review quarantine**, not runtime content and not gameplay truth.

Allowed contents:

- exact JSON proposal envelopes returned by the isolated Areloria Genkit control plane,
- human review notes that reference the exact proposal SHA-256 receipt.

Not allowed:

- snapshots presented as runtime evidence,
- server-authoritative tick/actor/chunk/hash fields invented by an AI tool,
- secrets or provider API keys,
- files loaded directly by the gameplay runtime.

A canonical quest proposal becomes authored content only after the separate promotion tool verifies its receipt, validates it against the current real `game-data` context, writes `game-data/quests/quests.json`, and successfully reads the content back.

The promotion step is still not runtime Green. A running server must load the promoted content through the normal content resolver before it can be claimed as live.
