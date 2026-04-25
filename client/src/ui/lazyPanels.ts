/**
 * Redirects to the new React-based UI system where applicable.
 */

export async function openInventory(): Promise<void> {
  window.dispatchEvent(new CustomEvent("areloria:open-panel", { detail: { panel: "inventory" } }));
}

export async function openSkillsPanel(): Promise<void> {
  window.dispatchEvent(new CustomEvent("areloria:open-panel", { detail: { panel: "skills" } }));
}

export async function openQuestLog(): Promise<void> {
  window.dispatchEvent(new CustomEvent("areloria:open-panel", { detail: { panel: "questlog" } }));
}

export async function openEquipmentPanel(): Promise<void> {
  window.dispatchEvent(new CustomEvent("areloria:open-panel", { detail: { panel: "equipment" } }));
}

export function preloadGamePanels(): void {
  // Preloading new React UI modules if needed
}
