import type { AreloriaGenkitApproval, AreloriaGenkitEffectClass } from "./contracts.js";

export interface AreloriaGenkitFlowCatalogEntry {
  flowName: string;
  capability:
    | "npc"
    | "quest_lore"
    | "quest_content"
    | "world_object"
    | "ui_menu"
    | "database"
    | "code_fix"
    | "playtest"
    | "asset";
  effectClass: AreloriaGenkitEffectClass;
  approval: AreloriaGenkitApproval;
  authoritativeWrite: false;
}

export const ARELORIA_GENKIT_FLOW_CATALOG = Object.freeze([
  {
    flowName: "areloriaNpcProposalFlow",
    capability: "npc",
    effectClass: "CONTENT_PROPOSAL",
    approval: "REVIEW_REQUIRED",
    authoritativeWrite: false,
  },
  {
    flowName: "areloriaQuestLoreFlow",
    capability: "quest_lore",
    effectClass: "CONTENT_PROPOSAL",
    approval: "REVIEW_REQUIRED",
    authoritativeWrite: false,
  },
  {
    flowName: "areloriaQuestContentFlow",
    capability: "quest_content",
    effectClass: "CONTENT_PROPOSAL",
    approval: "REVIEW_REQUIRED",
    authoritativeWrite: false,
  },
  {
    flowName: "areloriaWorldObjectProposalFlow",
    capability: "world_object",
    effectClass: "CONTENT_PROPOSAL",
    approval: "REVIEW_REQUIRED",
    authoritativeWrite: false,
  },
  {
    flowName: "areloriaUiMenuPlanFlow",
    capability: "ui_menu",
    effectClass: "UI_CODE_PLAN",
    approval: "REVIEW_REQUIRED",
    authoritativeWrite: false,
  },
  {
    flowName: "areloriaDatabasePlanFlow",
    capability: "database",
    effectClass: "DATABASE_WRITE_PLAN",
    approval: "OWNER_REQUIRED",
    authoritativeWrite: false,
  },
  {
    flowName: "areloriaCodeFixPlanFlow",
    capability: "code_fix",
    effectClass: "REPOSITORY_WRITE_PLAN",
    approval: "OWNER_REQUIRED",
    authoritativeWrite: false,
  },
  {
    flowName: "areloriaPlaytestAnalysisFlow",
    capability: "playtest",
    effectClass: "OBSERVABILITY_ANALYSIS",
    approval: "REVIEW_REQUIRED",
    authoritativeWrite: false,
  },
  {
    flowName: "areloriaAssetPlanFlow",
    capability: "asset",
    effectClass: "ASSET_PLAN",
    approval: "REVIEW_REQUIRED",
    authoritativeWrite: false,
  },
] as const satisfies readonly AreloriaGenkitFlowCatalogEntry[]);