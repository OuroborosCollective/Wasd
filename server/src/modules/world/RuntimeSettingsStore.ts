import fs from "fs";
import path from "path";

export type AREMode = "off" | "cpu" | "shader";

type RuntimeSettingsDocument = {
  version: number;
  areMode: AREMode;
};

const DEFAULT_SETTINGS_PATH = path.resolve(process.cwd(), "game-data/world/runtime-settings.json");
const DEFAULT_SETTINGS: RuntimeSettingsDocument = {
  version: 1,
  areMode: "shader",
};

export class RuntimeSettingsStore {
  private settings: RuntimeSettingsDocument = { ...DEFAULT_SETTINGS };

  constructor(private readonly settingsPath: string = DEFAULT_SETTINGS_PATH) {
    this.load();
  }

  public getAREMode(): AREMode {
    return this.settings.areMode;
  }

  public setAREMode(mode: AREMode): void {
    this.settings.areMode = mode;
    this.save();
  }

  private load(): void {
    if (!fs.existsSync(this.settingsPath)) {
      this.settings = { ...DEFAULT_SETTINGS };
      return;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(this.settingsPath, "utf-8"));
      const parsedMode = parsed?.areMode;
      const areMode: AREMode =
        parsedMode === "off" || parsedMode === "cpu" || parsedMode === "shader"
          ? parsedMode
          : DEFAULT_SETTINGS.areMode;
      this.settings = {
        version: Number.isFinite(Number(parsed?.version)) ? Number(parsed.version) : 1,
        areMode,
      };
    } catch (error) {
      console.error("[RuntimeSettingsStore] Failed to load runtime settings, using defaults.", error);
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(this.settingsPath), { recursive: true });
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
    } catch (error) {
      console.error("[RuntimeSettingsStore] Failed to save runtime settings.", error);
    }
  }
}
