import { ACTIVE_COMBAT_SKILLS } from "../game/combatSkills";
import { sendUseSkill } from "../networking/websocketClient";
import {
  getPlayerDead,
  getSkillCooldownUntil,
  subscribePlayerState,
} from "../state/playerState";

const ABBREV: Record<string, string> = {
  ember_bolt: "Em",
  frost_shard: "Fr",
  arc_spark: "Sp",
  vitality_tap: "♥",
  shadow_tag: "Sh",
  aether_pulse: "Ae",
};

let rafId: number | null = null;

function skillButton(skillId: string, label: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.dataset.skillId = skillId;
  btn.textContent = label;
  btn.title = ACTIVE_COMBAT_SKILLS.find((s) => s.id === skillId)?.name ?? skillId;
  btn.style.cssText = [
    "position:relative",
    "min-width:44px",
    "height:44px",
    "padding:0 10px",
    "border-radius:10px",
    "border:1px solid rgba(160,120,255,0.45)",
    "background:rgba(28,24,42,0.92)",
    "color:#f0e8ff",
    "font-size:13px",
    "font-weight:700",
    "cursor:pointer",
    "touch-action:manipulation",
    "overflow:hidden",
  ].join(";");
  const fill = document.createElement("div");
  fill.style.cssText = [
    "position:absolute",
    "left:0",
    "bottom:0",
    "height:3px",
    "width:0%",
    "background:linear-gradient(90deg,#8b5cf6,#c4b5fd)",
    "pointer-events:none",
    "transition:width 0.08s linear",
  ].join(";");
  btn.appendChild(fill);
  btn.onclick = () => sendUseSkill(skillId);
  return btn;
}

function updateBar(root: HTMLElement) {
  const dead = getPlayerDead();
  const cds = getSkillCooldownUntil();
  const now = Date.now();
  for (const btn of root.querySelectorAll("button[data-skill-id]")) {
    const el = btn as HTMLButtonElement;
    const id = el.dataset.skillId!;
    const until = cds[id] ?? 0;
    const onCd = until > now;
    el.disabled = dead || onCd;
    el.style.opacity = dead ? "0.35" : onCd ? "0.55" : "1";
    const fill = el.querySelector("div") as HTMLDivElement | null;
    if (fill && onCd) {
      const def = ACTIVE_COMBAT_SKILLS.find((s) => s.id === id);
      const total = def?.cooldownMs && def.cooldownMs > 0 ? def.cooldownMs : 3000;
      const left = Math.max(0, until - now);
      const pct = Math.min(100, Math.max(0, (1 - left / total) * 100));
      fill.style.width = `${pct}%`;
    } else if (fill) {
      fill.style.width = "0%";
    }
  }
}

export function mountSkillBar() {
  if (document.getElementById("skill-action-bar")) return;

  const root = document.createElement("div");
  root.id = "skill-action-bar";
  root.setAttribute("role", "toolbar");
  root.setAttribute("aria-label", "Combat skills");
  root.style.cssText = [
    "position:fixed",
    "left:50%",
    "bottom:max(88px,env(safe-area-inset-bottom,0px))",
    "transform:translateX(-50%)",
    "display:flex",
    "flex-wrap:wrap",
    "justify-content:center",
    "gap:8px",
    "z-index:4900",
    "max-width:min(96vw,520px)",
    "pointer-events:auto",
  ].join(";");

  for (const s of ACTIVE_COMBAT_SKILLS) {
    root.appendChild(skillButton(s.id, ABBREV[s.id] ?? s.id.slice(0, 2)));
  }

  document.body.appendChild(root);

  const tick = () => {
    updateBar(root);
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  subscribePlayerState(() => updateBar(root));
}

export function teardownSkillBar() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  document.getElementById("skill-action-bar")?.remove();
}
