import fs from "fs";
import path from "path";

export type AREMode = "off" | "cpu" | "shader";
export type AREDeviceClass = "desktop" | "mobile" | "low_end";

type RuntimeSettingsDocument = {
  version: number;
  areMode: AREMode;
  deviceClassDefaults: Record<AREDeviceClass, AREMode>;
};

const DEFAULT_SETTINGS_PATH = path.resolve(process.cwd(), "game-data/world/runtime-settings.json");
const DEFAULT_SETTINGS: RuntimeSettingsDocument = {
  version: 1,
  areMode: "shader",
  deviceClassDefaults: {
    desktop: "shader",
    mobile: "cpu",
    low_end: "off",
  },
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

  public getAREModeForDeviceClass(deviceClass: AREDeviceClass | undefined): AREMode {
    const key = deviceClass ?? "desktop";
    return this.settings.deviceClassDefaults[key] ?? this.settings.areMode;
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
      const defaultsRaw =
        parsed?.deviceClassDefaults && typeof parsed.deviceClassDefaults === "object"
          ? (parsed.deviceClassDefaults as Record<string, unknown>)
          : {};
      const deviceClassDefaults: Record<AREDeviceClass, AREMode> = {
        desktop:
          defaultsRaw.desktop === "off" || defaultsRaw.desktop === "cpu" || defaultsRaw.desktop === "shader"
            ? defaultsRaw.desktop
            : DEFAULT_SETTINGS.deviceClassDefaults.desktop,
        mobile:
          defaultsRaw.mobile === "off" || defaultsRaw.mobile === "cpu" || defaultsRaw.mobile === "shader"
            ? defaultsRaw.mobile
            : DEFAULT_SETTINGS.deviceClassDefaults.mobile,
        low_end:
          defaultsRaw.low_end === "off" || defaultsRaw.low_end === "cpu" || defaultsRaw.low_end === "shader"
            ? defaultsRaw.low_end
            : DEFAULT_SETTINGS.deviceClassDefaults.low_end,
      };
      this.settings = {
        version: Number.isFinite(Number(parsed?.version)) ? Number(parsed.version) : 1,
        areMode,
        deviceClassDefaults,
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
