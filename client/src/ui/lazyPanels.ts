/**
 * Dynamic imports keep the initial bundle smaller; first open loads the chunk.
 */

export async function openInventory(): Promise<void> {
  const m = await import("./inventory");
  m.renderInventory();
}

export async function openSkillsPanel(): Promise<void> {
  const m = await import("./skillsPanel");
  m.renderSkillsPanel();
}

export async function openQuestLog(): Promise<void> {
  const m = await import("./questLog");
  m.renderQuestLog();
}

export async function openEquipmentPanel(): Promise<void> {
  const m = await import("./equipmentPanel");
  m.renderEquipmentPanel();
}

export function preloadGamePanels(): void {
  const run = () => {
    void import("./inventory");
    void import("./skillsPanel");
    void import("./questLog");
    void import("./equipmentPanel");
  };
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 5000 });
  } else {
    window.setTimeout(run, 2500);
  }
}
