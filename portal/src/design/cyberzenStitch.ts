import type { CSSProperties } from "react";
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
  readonly id: CyberZenStitchArchetype;
  readonly title: string;
  readonly role: string;
  readonly palette: readonly string[];
  readonly sourceScreens: readonly string[];
  readonly runtimeUse: string;
}

export const CYBERZEN_STITCH_TEMPLATES = [
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
] as const satisfies readonly CyberZenStitchTemplate[];

const DEFAULT_TEMPLATE_ID: CyberZenStitchArchetype = "science_hub";

const CYBERZEN_TEMPLATE_BY_ID: Readonly<Record<CyberZenStitchArchetype, CyberZenStitchTemplate>> =
  Object.freeze(
    CYBERZEN_STITCH_TEMPLATES.reduce(
      (acc, template) => {
        acc[template.id] = template;
        return acc;
      },
      {} as Record<CyberZenStitchArchetype, CyberZenStitchTemplate>,
    ),
  );

const MODE_TO_TEMPLATE_ID: Readonly<Partial<Record<ThemeAuraMode, CyberZenStitchArchetype>>> =
  Object.freeze({
    fire_glitch: "fire_ouroboros",
    repair_surgery: "fire_ouroboros",
    oracle_gold: "are_logik",
    governance_sovereign: "science_hub",
    observation_past: "chain_validator",
    identity_cyan: "auth_root",
    loot_legendary: "cyber_globe",
  });

export type CyberZenTemplateCssVars = CSSProperties & {
  "--stitch-bg": string;
  "--stitch-a": string;
  "--stitch-b": string;
  "--stitch-c": string;
  "--stitch-danger": string;
  "--stitch-glow": string;
};

export function selectCyberZenTemplate(visual: VisualThemeState): CyberZenStitchTemplate {
  const mode = visual?.mode;
  const templateId = mode ? MODE_TO_TEMPLATE_ID[mode] : undefined;

  return byId(templateId ?? DEFAULT_TEMPLATE_ID);
}

export function byId(id: CyberZenStitchArchetype): CyberZenStitchTemplate {
  return CYBERZEN_TEMPLATE_BY_ID[id] ?? CYBERZEN_TEMPLATE_BY_ID[DEFAULT_TEMPLATE_ID];
}

export function isCyberZenStitchArchetype(value: string): value is CyberZenStitchArchetype {
  return value in CYBERZEN_TEMPLATE_BY_ID;
}

export function getCyberZenTemplateTitle(id: CyberZenStitchArchetype): string {
  return byId(id).title;
}

export function getCyberZenTemplateRuntimeUse(id: CyberZenStitchArchetype): string {
  return byId(id).runtimeUse;
}

export function cyberZenTemplateCssVars(template: CyberZenStitchTemplate): CyberZenTemplateCssVars {
  const [bg = "#0a0a0a", a = "#00E5FF", b = "#39FF14", c = "#FF7A00"] = template.palette;

  return {
    "--stitch-bg": bg,
    "--stitch-a": a,
    "--stitch-b": b,
    "--stitch-c": c,
    "--stitch-danger": template.id === "fire_ouroboros" ? "#E60000" : c,
    "--stitch-glow": `0 0 22px ${a}`,
  };
}

export function cyberZenTemplateClassName(template: CyberZenStitchTemplate): string {
  return `cyberzen-stitch cyberzen-stitch--${template.id}`;
}

export function cyberZenTemplateDataAttrs(template: CyberZenStitchTemplate): {
  "data-stitch-template": CyberZenStitchArchetype;
  "data-stitch-role": string;
} {
  return {
    "data-stitch-template": template.id,
    "data-stitch-role": template.role,
  };
}

export function selectCyberZenTemplateCssVars(visual: VisualThemeState): CyberZenTemplateCssVars {
  return cyberZenTemplateCssVars(selectCyberZenTemplate(visual));
}
