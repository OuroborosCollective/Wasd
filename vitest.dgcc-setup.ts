/**
 * Ensures DGCC Vitest runs keep PERSISTENCE_DRIVER=file when it would otherwise
 * stay at `auto` and pick a remote persistence backend from the outer environment.
 */
if (!process.env.PERSISTENCE_DRIVER?.trim() || process.env.PERSISTENCE_DRIVER === "auto") {
  process.env.PERSISTENCE_DRIVER = "file";
}
