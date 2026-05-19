import type { ThemeAuraMode, VisualThemeState } from "@wasd/shared";

export type CyberZenStitchArchetype =
  | "auth_root"
  | "science_hub"
  | "chain_validator"
  | "cyber_globe"
  | "fire_ouroboros"
  | "are_logik"
  | "mobile_dash"
  | "route_selector";

export interface CyberZenStitchTemplate {
  id: CyberZenStitchArchetype;
  title: string;
  role: string;
  palette: string[];
  sourceScreens: string[];
  runtimeUse: string;
}

export const CYBERZEN_STITCH_TEMPLATES: CyberZenStitchTemplate[] = [
  {
    id: "auth_root",
    title: "AUTH_ROOT",
    role: "Deterministic Gateway",
    palette: ["#0a0a0a", "#00E5FF", "#FF7A00", "#39FF14"],
    sourceScreens: ["screen (3).png", "screen (4).png"],
    runtimeUse: "Login, kappaPos hash, identity bootstrap",
  },
  {
    id: "science_hub",
    title: "SCIENCE_PORTAL_HUB",
    role: "Main Dashboard",
    palette: ["#0a0a0a", "#00E5FF", "#FF7A00", "#E60000"],
    sourceScreens: ["screen (10).png"],
    runtimeUse: "Portal overview, telemetry, heatmaps, Emily status",
  },
  {
    id: "chain_validator",
    title: "CHAIN_STRING_VALIDATOR",
    role: "Security Bridge",
    palette: ["#0a0a0a", "#00E5FF", "#39FF14"],
    sourceScreens: ["screen.png", "screen (1).png", "screen (2).png"],
    runtimeUse: "Hash bridge, vault transfer, route validation",
  },
  {
    id: "cyber_globe",
    title: "CYBER_GLOBE",
    role: "World/Asset Repository",
    palette: ["#0a0a0a", "#00E5FF", "#FF7A00"],
    sourceScreens: ["screen (5).png"],
    runtimeUse: "Right rail, global asset status, world mesh",
  },
  {
    id: "fire_ouroboros",
    title: "ORGANIC_FIRE_OUROBOROS",
    role: "Crisis / Repair / Hazard",
    palette: ["#0a0a0a", "#FF7A00", "#E60000", "#39FF14"],
    sourceScreens: ["screen (6).png"],
    runtimeUse: "AutoRepair, Fire Glitch, scarcity crisis",
  },
  {
    id: "are_logik",
    title: "ARE_LOGIK",
    role: "Core Logic Emblem",
    palette: ["#0a0a0a", "#00E5FF", "#39FF14", "#FF7A00"],
    sourceScreens: ["screen (7).png"],
    runtimeUse: "ARE kernel, SDK, root logic state",
  },
  {
    id: "mobile_dash",
    title: "SYSTEM_DASH_MOBILE",
    role: "Mobile Cockpit",
    palette: ["#0a0a0a", "#00E5FF", "#FF7A00"],
    sourceScreens: ["screen (8).png"],
    runtimeUse: "Android status layout and bottom nav",
  },
  {
    id: "route_selector",
    title: "ROUTE_SELECTOR",
    role: "Post-login Branching",
    palette: ["#0a0a0a", "#00E5FF", "#FFD76A", "#39FF14"],
    sourceScreens: ["planned"],
    runtimeUse: "After AUTH_ROOT choose 3D Client, 2D Client or Science Portal",
  },
];

export function selectCyberZenTemplate(visual: VisualThemeState): CyberZenStitchTemplate {
  const mode: ThemeAuraMode = visual.mode;
  if (mode === "fire_glitch" || mode === "repair_surgery") return byId("fire_ouroboros");
  if (mode === "oracle_gold") return byId("are_logik");
  if (mode === "governance_sovereign") return byId("science_hub");
  if (mode === "observation_past") return byId("chain_validator");
  if (mode === "identity_cyan") return byId("auth_root");
  if (mode === "loot_legendary") return byId("cyber_globe");
  return byId("science_hub");
}

export function byId(id: CyberZenStitchArchetype): CyberZenStitchTemplate {
  return CYBERZEN_STITCH_TEMPLATES.find((template) => template.id === id) ?? CYBERZEN_STITCH_TEMPLATES[0];
}

export function cyberZenTemplateCssVars(template: CyberZenStitchTemplate): React.CSSProperties {
  const [a = "#00E5FF", b = "#39FF14", c = "#FF7A00"] = template.palette;
  return {
    "--stitch-a": a,
    "--stitch-b": b,
    "--stitch-c": c,
  } as React.CSSProperties;
}
