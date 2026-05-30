// The old DOM marker overlay is intentionally disabled.
// Bootstrap NPCs are rendered through the Pixi scene / asset binding layer instead.
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("client2d-bootstrap-npc-overlay")?.remove();
    document.getElementById("client2d-bootstrap-npc-overlay-style")?.remove();
  }, { once: true });
}

export {};
