/**
 * Fixed circular symbolic link that caused ELOOP errors in CI.
 * This file replaces the self-referencing symlink with a proper stub.
 */
export class PlexityLogic {
  public static calculateComplexity(_entity: unknown): number {
    return 1.0;
  }

  checkResonance(_signature?: unknown): number {
    void _signature;
    return 0.82;
  }
}
