# Areloria Studio Scope Summary

This integration intentionally covers four separate truth/effect surfaces:

1. `AUTHORED_CONFIGURATION` — game-data, presentation bindings and render profiles.
2. `REPOSITORY_CHANGE` — hash-bound source/config edits that still require build/deploy/readback.
3. `PRESENTATION_ONLY` — 2D sprites/atlases and 3D models/render settings; never gameplay authority.
4. `LIVE_ADMIN_EFFECT` — existing authenticated GLB/asset-pool/placement APIs with target readback.

It does not introduce a second NPC server, simulation loop, world hash, canonical intent implementation or gameplay database.

Primary capabilities include quests, lore, NPC/monster data, routes, drops, politics, needs, trade/economy/auction configuration, UI/menu code, 2D/3D visual binding, Babylon rendering profiles, database-backed runtime assets and settlement/environment placement.
