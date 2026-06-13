# Live NPC/world wiring follow-up

This branch fixes the immediate client-side usability issues visible on mobile:

- NPC context window was relying on utility classes that were not guaranteed to exist in the 2D client stylesheet.
- Mobile chat was too small to be usable.

Remaining server-side truth-path work still required before claiming full live NPC autonomy:

- Register the loaded NPCSystem in the ThinShell tick registry.
- Stream live NPC positions in WORLD_HEARTBEAT payloads.
- Normalize game-data spawn y coordinates into the client-visible z axis.
- Add a release proof that NPC positions change across ticks and are visible in the 2D client.

No Green-State claim for full NPC autonomy should be made until those server-side checks are merged and verified.
