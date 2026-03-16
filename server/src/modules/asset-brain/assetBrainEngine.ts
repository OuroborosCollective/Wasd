import { invokeLLM } from "../_core/llm";

/**
 * Asset Brain Engine - Transforms user input into complete 3D asset specifications
 * Based on MASTER ASSET BRAIN PACK system
 */

export type AssetClass = "character" | "creature" | "prop" | "weapon" | "environment";
export type PlatformProfile = "mobile" | "mid" | "high";

interface PlatformBudget {
  triangles: number;
  materials: number;
  bones: number;
  textureSize: string;
  textureMemory: number;
}

interface AssetSpecification {
  assetName: string;
  assetClass: AssetClass;
  usage: string;
  style: string;
  platformProfiles: Record<PlatformProfile, PlatformBudget>;
  dimensions: {
    unit: string;
    height: number;
    width: number;
    depth: number;
  };
  topology: {
    meshType: string;
    triangleBudget: Record<PlatformProfile, number>;
    deformationZones: string[];
    hardSurfaceRules: string[];
    organicRules: string[];
  };
  uv: {
    uvSets: number;
    mirroringAllowed: boolean;
    texelDensity: string;
    seamRules: string[];
  };
  materials: {
    count: number;
    workflow: string;
    maps: string[];
    channels: Record<string, string>;
  };
  rig: {
    required: boolean;
    type: string;
    boneCountTargets: Record<PlatformProfile, number>;
    bones: string[];
    constraints: string[];
    facial: Record<string, unknown>;
  };
  animations: {
    required: boolean;
    clips: string[];
    looping: string[];
    oneShots: string[];
  };
  lods: {
    count: number;
    strategy: string;
    budgets: Array<{ level: string; triangles: number; materials: number }>;
  };
  collision: {
    type: string;
    parts: string[];
  };
  attachments: {
    sockets: Array<{ name: string; parent: string }>;
  };
  export: {
    primaryFormat: string;
    secondaryFormats: string[];
    validation: string[];
  };
  fileContract: {
    rootFolder: string;
    requiredFiles: string[];
    namingRules: string[];
  };
  qa: {
    checklist: string[];
    criticalChecks: string[];
  };
  autoDecisions: string[];
  variants: {
    hero: Partial<AssetSpecification>;
    gameplay: Partial<AssetSpecification>;
    mobileweb: Partial<AssetSpecification>;
  };
}

// Platform budgets based on asset class
const PLATFORM_BUDGETS: Record<AssetClass, Record<PlatformProfile, PlatformBudget>> = {
  character: {
    mobile: { triangles: 10000, materials: 2, bones: 60, textureSize: "1024x1024", textureMemory: 4 },
    mid: { triangles: 25000, materials: 2, bones: 90, textureSize: "2048x2048", textureMemory: 16 },
    high: { triangles: 60000, materials: 4, bones: 150, textureSize: "4096x4096", textureMemory: 64 },
  },
  creature: {
    mobile: { triangles: 12000, materials: 2, bones: 50, textureSize: "1024x1024", textureMemory: 4 },
    mid: { triangles: 30000, materials: 3, bones: 100, textureSize: "2048x2048", textureMemory: 16 },
    high: { triangles: 70000, materials: 4, bones: 180, textureSize: "4096x4096", textureMemory: 64 },
  },
  prop: {
    mobile: { triangles: 2000, materials: 1, bones: 0, textureSize: "512x512", textureMemory: 1 },
    mid: { triangles: 8000, materials: 2, bones: 0, textureSize: "1024x1024", textureMemory: 4 },
    high: { triangles: 25000, materials: 3, bones: 0, textureSize: "2048x2048", textureMemory: 16 },
  },
  weapon: {
    mobile: { triangles: 1500, materials: 1, bones: 5, textureSize: "512x512", textureMemory: 1 },
    mid: { triangles: 6000, materials: 1, bones: 10, textureSize: "1024x1024", textureMemory: 4 },
    high: { triangles: 20000, materials: 2, bones: 15, textureSize: "2048x2048", textureMemory: 16 },
  },
  environment: {
    mobile: { triangles: 5000, materials: 1, bones: 0, textureSize: "512x512", textureMemory: 1 },
    mid: { triangles: 15000, materials: 2, bones: 0, textureSize: "1024x1024", textureMemory: 4 },
    high: { triangles: 50000, materials: 3, bones: 0, textureSize: "2048x2048", textureMemory: 16 },
  },
};

// Asset class keywords for classification
const ASSET_CLASS_KEYWORDS: Record<AssetClass, string[]> = {
  character: ["knight", "warrior", "mage", "archer", "hero", "npc", "player", "human", "elf", "dwarf", "barbarian", "paladin"],
  creature: ["dragon", "goblin", "slime", "beast", "monster", "boss", "demon", "orc", "troll", "werewolf", "zombie", "spider"],
  prop: ["tree", "rock", "chest", "torch", "altar", "door", "chair", "table", "barrel", "crate", "lantern", "statue"],
  weapon: ["sword", "bow", "rifle", "staff", "hammer", "gun", "axe", "spear", "dagger", "mace", "crossbow", "blade"],
  environment: ["tavern", "castle", "dungeon", "bridge", "tower", "temple", "village", "forest", "cave", "ruins", "city", "house"],
};

/**
 * Classify asset based on input keywords
 */
function classifyAsset(input: string): AssetClass {
  const lowerInput = input.toLowerCase();

  for (const [assetClass, keywords] of Object.entries(ASSET_CLASS_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerInput.includes(keyword)) {
        return assetClass as AssetClass;
      }
    }
  }

  // Default classification based on heuristics
  if (lowerInput.includes("character") || lowerInput.includes("humanoid")) return "character";
  if (lowerInput.includes("creature") || lowerInput.includes("monster")) return "creature";
  if (lowerInput.includes("weapon") || lowerInput.includes("arm")) return "weapon";
  if (lowerInput.includes("environment") || lowerInput.includes("modular")) return "environment";

  // Default to prop
  return "prop";
}

/**
 * Extract style hints from input
 */
function extractStyle(input: string): string {
  const lowerInput = input.toLowerCase();

  if (lowerInput.includes("realistic") || lowerInput.includes("photorealistic")) return "realistic PBR";
  if (lowerInput.includes("stylized") || lowerInput.includes("cartoon")) return "stylized PBR";
  if (lowerInput.includes("hand-painted")) return "hand-painted PBR";
  if (lowerInput.includes("sci-fi") || lowerInput.includes("scifi")) return "sci-fi PBR";
  if (lowerInput.includes("fantasy")) return "fantasy PBR";
  if (lowerInput.includes("lowpoly")) return "low-poly stylized";

  return "semi-stylized realtime PBR";
}

/**
 * Build master prompt for LLM
 */
function buildMasterPrompt(input: string, assetClass: AssetClass, style: string): string {
  return `You are a specialized 3D asset architect for real-time games. Transform this input into a complete, production-ready asset specification.

INPUT: "${input}"
ASSET CLASS: ${assetClass}
STYLE: ${style}

Generate a comprehensive JSON specification following this structure:
{
  "assetName": "clear, concise name",
  "assetClass": "${assetClass}",
  "usage": "primary game usage context",
  "style": "${style}",
  "platformProfiles": {
    "mobile": { "triangles": number, "materials": number, "bones": number },
    "mid": { "triangles": number, "materials": number, "bones": number },
    "high": { "triangles": number, "materials": number, "bones": number }
  },
  "dimensions": { "unit": "meters", "height": number, "width": number, "depth": number },
  "topology": {
    "meshType": "description of mesh construction",
    "triangleBudget": { "mobile": number, "mid": number, "high": number },
    "deformationZones": ["list of deformation areas"],
    "hardSurfaceRules": ["rules for hard surfaces"],
    "organicRules": ["rules for organic shapes"]
  },
  "uv": {
    "uvSets": number,
    "mirroringAllowed": boolean,
    "texelDensity": "description",
    "seamRules": ["seam placement rules"]
  },
  "materials": {
    "count": number,
    "workflow": "PBR metallic-roughness",
    "maps": ["list of texture maps"],
    "channels": { "map_name": "channel description" }
  },
  "rig": {
    "required": boolean,
    "type": "rig type if needed",
    "boneCountTargets": { "mobile": number, "mid": number, "high": number },
    "bones": ["list of bone names"],
    "constraints": ["constraint descriptions"],
    "facial": {}
  },
  "animations": {
    "required": boolean,
    "clips": ["animation clip names"],
    "looping": ["looping animation names"],
    "oneShots": ["one-shot animation names"]
  },
  "lods": {
    "count": number,
    "strategy": "LOD reduction strategy",
    "budgets": [{ "level": "LOD0", "triangles": number, "materials": number }]
  },
  "collision": {
    "type": "collision type",
    "parts": ["collision parts"]
  },
  "attachments": {
    "sockets": [{ "name": "socket name", "parent": "parent bone/mesh" }]
  },
  "export": {
    "primaryFormat": "GLB",
    "secondaryFormats": ["FBX"],
    "validation": ["validation checks"]
  },
  "fileContract": {
    "rootFolder": "folder structure",
    "requiredFiles": ["required file names"],
    "namingRules": ["naming conventions"]
  },
  "qa": {
    "checklist": ["20+ QA checks"],
    "criticalChecks": ["critical validation points"]
  },
  "autoDecisions": ["list of automatic decisions made"],
  "variants": {
    "hero": { "triangles": number, "materials": number, "description": "hero variant" },
    "gameplay": { "triangles": number, "materials": number, "description": "gameplay optimized" },
    "mobileweb": { "triangles": number, "materials": number, "description": "ultra-light mobile/web" }
  }
}

CRITICAL RULES:
1. Never be vague - provide measurable specifications
2. Include all three platform profiles (mobile, mid, high)
3. Ensure topology is game-ready and export-safe
4. Provide realistic triangle and bone budgets per platform
5. Include at least 20 QA checklist items
6. Always output valid JSON without comments
7. Make automatic decisions - do not ask for clarification
8. Consider platform constraints and performance budgets

Return ONLY valid JSON, no additional text.`;
}

/**
 * Generate complete asset specification from user input
 */
export async function generateAssetSpecification(input: string): Promise<AssetSpecification> {
  // Classify asset and extract style
  const assetClass = classifyAsset(input);
  const style = extractStyle(input);

  // Build master prompt
  const masterPrompt = buildMasterPrompt(input, assetClass, style);

  // Call LLM
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a specialized 3D asset architect for real-time games. Generate production-ready asset specifications in valid JSON format.",
      },
      {
        role: "user",
        content: masterPrompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "asset_specification",
        strict: true,
        schema: {
          type: "object",
          properties: {
            assetName: { type: "string" },
            assetClass: { type: "string" },
            usage: { type: "string" },
            style: { type: "string" },
            platformProfiles: { type: "object" },
            dimensions: { type: "object" },
            topology: { type: "object" },
            uv: { type: "object" },
            materials: { type: "object" },
            rig: { type: "object" },
            animations: { type: "object" },
            lods: { type: "object" },
            collision: { type: "object" },
            attachments: { type: "object" },
            export: { type: "object" },
            fileContract: { type: "object" },
            qa: { type: "object" },
            autoDecisions: { type: "array" },
            variants: { type: "object" },
          },
          required: [
            "assetName",
            "assetClass",
            "usage",
            "style",
            "platformProfiles",
            "dimensions",
            "topology",
            "uv",
            "materials",
            "rig",
            "animations",
            "lods",
            "collision",
            "attachments",
            "export",
            "fileContract",
            "qa",
            "autoDecisions",
            "variants",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  // Parse LLM response
  const messageContent = response.choices[0]?.message.content;
  if (!messageContent) {
    throw new Error("No response from LLM");
  }

  let content: string;
  if (typeof messageContent === "string") {
    content = messageContent;
  } else if (Array.isArray(messageContent)) {
    const textContent = messageContent.find((c: any) => c.type === "text") as any;
    content = textContent?.text || "";
  } else {
    throw new Error("Unexpected LLM response format");
  }

  let specification: AssetSpecification;
  try {
    specification = JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error}`);
  }

  // Add auto-decisions if not present
  if (!specification.autoDecisions) {
    specification.autoDecisions = [
      `Classified as ${assetClass} based on input keywords`,
      `Assigned style: ${style}`,
      `Generated platform budgets based on asset class heuristics`,
      `Applied standard rigging and animation recommendations`,
    ];
  }

  return specification;
}

/**
 * Generate platform-optimized variants
 */
export function generateVariants(spec: AssetSpecification): Record<string, Partial<AssetSpecification>> {
  const budgets = PLATFORM_BUDGETS[spec.assetClass];

  return {
    hero: {
      topology: {
        ...spec.topology,
        triangleBudget: {
          mobile: budgets.mobile.triangles,
          mid: budgets.mid.triangles,
          high: budgets.high.triangles,
        },
      },
      materials: {
        ...spec.materials,
        count: budgets.high.materials,
      },
    },
    gameplay: {
      topology: {
        ...spec.topology,
        triangleBudget: {
          mobile: Math.floor(budgets.mobile.triangles * 0.75),
          mid: Math.floor(budgets.mid.triangles * 0.75),
          high: Math.floor(budgets.high.triangles * 0.75),
        },
      },
      materials: {
        ...spec.materials,
        count: Math.max(1, budgets.mid.materials - 1),
      },
    },
    mobileweb: {
      topology: {
        ...spec.topology,
        triangleBudget: {
          mobile: Math.floor(budgets.mobile.triangles * 0.5),
          mid: Math.floor(budgets.mid.triangles * 0.5),
          high: Math.floor(budgets.high.triangles * 0.5),
        },
      },
      materials: {
        ...spec.materials,
        count: 1,
      },
    },
  };
}
