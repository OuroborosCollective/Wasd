import { CLIENT_2D_PIXI_MODULE_DECISIONS, CLIENT_2D_VISUAL_POLICY } from "./client2dPixiModules";

export function PixiModuleInspector() {
  const core = CLIENT_2D_PIXI_MODULE_DECISIONS.filter((entry) => entry.use === "core");
  const optional = CLIENT_2D_PIXI_MODULE_DECISIONS.filter((entry) => entry.use === "optional");
  const avoided = CLIENT_2D_PIXI_MODULE_DECISIONS.filter((entry) => entry.use === "avoid");

  return (
    <aside className="pixi-module-inspector" aria-label="Areloria Pixi module policy">
      <strong>Pixi Kit</strong>
      <span>core {core.length}</span>
      <span>optional {optional.length}</span>
      <span>avoid {avoided.length}</span>
      <small>{CLIENT_2D_VISUAL_POLICY.gameplayAuthority}</small>
    </aside>
  );
}
