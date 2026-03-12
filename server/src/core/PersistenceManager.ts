import fs from 'fs';
import path from 'path';

/**
 * PersistenceManager — simple JSON file-based player data persistence.
 *
 * Reads and writes all player records to a single JSON file located at
 * `<cwd>/data/players.json`.  The parent directory is created automatically
 * on construction if it does not already exist.
 *
 * This is an intentionally minimal persistence layer suited for development
 * and small-scale deployments.  For production workloads the data store
 * should be replaced with a proper database backend.
 *
 * The data format is a plain object keyed by player/character name:
 * ```json
 * {
 *   "Hero": { "id": "Hero", "gold": 500, "xp": 1200, ... },
 *   "Aria":  { "id": "Aria",  "gold": 120, "xp":  300, ... }
 * }
 * ```
 *
 * @see {@link WorldTick.saveAll} for the caller that serialises player state
 *      before passing it here.
 */
export class PersistenceManager {
  private filePath: string;

  /**
   * Resolves the storage path to `<cwd>/data/players.json` and ensures the
   * `data/` directory exists.
   */
  constructor() {
    this.filePath = path.join(process.cwd(), 'data', 'players.json');
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Serialises `data` to pretty-printed JSON and writes it synchronously to
   * the storage file.  Any write error is logged to `console.error` and
   * silently swallowed so that a persistence failure does not crash the
   * game server.
   *
   * @param data - A plain object mapping character names to player state
   *               objects.  Must be JSON-serialisable.
   */
  save(data: any) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Failed to save persistence data:', err);
    }
  }

  /**
   * Reads and parses the storage file, returning all persisted player records.
   * Returns an empty object if the file does not exist or if parsing fails.
   * Parse errors are logged to `console.error`.
   *
   * @returns A plain object mapping character names to their persisted state,
   *          or `{}` when no data is available.
   */
  load(): any {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (err) {
      console.error('Failed to load persistence data:', err);
    }
    return {};
  }
}
