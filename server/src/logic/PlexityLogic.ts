/**
 * Fixed circular symbolic link that caused ELOOP errors in CI.
 * This file replaces the self-referencing symlink with a proper stub.
 */
export class PlexityLogic {
  checkResonance() { return false; }
}
