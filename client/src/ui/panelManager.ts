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
}
