/**
 * Fixed circular symbolic link that caused ELOOP errors in CI.
 * This file replaces the self-referencing symlink with a proper stub.
 */
export class PlexityLogic {
  public static calculateComplexity(_entity: any): number { return 1.0; }
  checkResonance(_signature?: any): number { return 0.0; }
}
