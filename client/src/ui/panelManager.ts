/**
 * Panel Manager
 * Redirects legacy panel calls to the new React-based UI if needed,
 * or handles closing of existing DOM panels.
 */

export function closeAllPanels() {
  const panelIds = [
    'inventory-panel',
    'skills-panel',
    'questlog-panel',
    'equipment-panel'
  ];

  panelIds.forEach(id => {
    const panel = document.getElementById(id);
    if (panel) {
      panel.style.display = 'none';
    }
  });

  // Also dispatch an event to let React UI know it should close panels
  window.dispatchEvent(new CustomEvent("areloria:close-all-panels"));
}
