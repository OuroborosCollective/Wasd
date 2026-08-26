// Shared deterministic runtime prerequisite for modules that resolve a world seed
// at import time. Production still requires an explicit deployment seed.
process.env.WASD_WORLD_SEED ??= "wasd-vitest-world-seed";
