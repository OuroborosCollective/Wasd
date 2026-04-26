import fs from "node:fs";
import path from "node:path";
import type { PlaytesterDebugLogEntry } from "./playtesterTypes.js";

export class PlaytesterDebugLog {
  private readonly enabled: boolean;
  private readonly filePath: string;

  constructor(filePath: string, enabled: boolean) {
    this.enabled = enabled;
    this.filePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    if (!this.enabled) {
      return;
    }
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
  }

  write(entry: PlaytesterDebugLogEntry): void {
    if (!this.enabled) return;
    try {
      fs.appendFileSync(this.filePath, `${JSON.stringify(entry)}\n`, "utf8");
    } catch (error) {
      console.warn("[PlaytesterDebugLog] Failed to write entry", error);
    }
  }

  getFilePath(): string {
    return this.filePath;
  }
}
