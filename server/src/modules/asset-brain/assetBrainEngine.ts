/**
 * Asset Brain Engine - Transforms user input into complete 3D asset specifications
 * Based on MASTER ASSET BRAIN PACK system
 */
export type AssetClass = 'character' | 'creature' | 'prop' | 'weapon' | 'environment';
export type PlatformProfile = 'mobile' | 'mid' | 'high';

export interface PlatformBudget {
  triangles: number;
  materials: number;
  bones: number;
  textureSize: string;
  textureMemory: number;
}

export interface AssetSpecification {
  assetName: string;
  assetClass: AssetClass;
  usage: string;
  style: string;
  platformProfiles: Record<PlatformProfile, PlatformBudget>;
  dimensions: { unit: string; height: number; width: number; depth: number };
  topology: {
    meshType: string;
    triangleBudget: Record<PlatformProfile, number>;
    deformationZones: string[];
    hardSurfaceRules: string[];
    organicRules: string[];
  };
  uv: { uvSets: number; mirroringAllowed: boolean; texelDensity: string; seamRules: string[] };
  materials: { count: number; workflow: string; maps: string[]; channels: Record<string, string> };
  rig: {
    required: boolean;
    type: string;
    boneCountTargets: Record<PlatformProfile, number>;
    bones: string[];
    constraints: string[];
    facial: Record<string, unknown>;
  };
  animations: { required: boolean; clips: string[]; looping: string[]; oneShots: string[] };
  lods: {
    count: number;
    strategy: string;
    budgets: Array<{ level: string; triangles: number; materials: number }>;
  };
  collision: { type: string; parts: string[] };
  attachments: { sockets: Array<{ name: string; parent: string }> };
  export: { primaryFormat: string; secondaryFormats: string[]; validation: string[] };
  fileContract: { rootFolder: string; requiredFiles: string[]; namingRules: string[] };
  qa: { checklist: string[]; criticalChecks: string[] };
  autoDecisions: string[];
}

const PLATFORM_BUDGETS: Record<AssetClass, Record<PlatformProfile, PlatformBudget>> = {
  character:   {
    mobile: { triangles: 10000, materials: 2, bones: 60,  textureSize: '1024x1024', textureMemory: 4  },
    mid:    { triangles: 25000, materials: 2, bones: 90,  textureSize: '2048x2048', textureMemory: 16 },
    high:   { triangles: 60000, materials: 4, bones: 150, textureSize: '4096x4096', textureMemory: 64 },
  },
  creature:    {
    mobile: { triangles: 12000, materials: 2, bones: 50,  textureSize: '1024x1024', textureMemory: 4  },
    mid:    { triangles: 30000, materials: 3, bones: 100, textureSize: '2048x2048', textureMemory: 16 },
    high:   { triangles: 70000, materials: 4, bones: 180, textureSize: '4096x4096', textureMemory: 64 },
  },
  prop:        {
    mobile: { triangles: 2000,  materials: 1, bones: 0, textureSize: '512x512',   textureMemory: 1  },
    mid:    { triangles: 8000,  materials: 2, bones: 0, textureSize: '1024x1024', textureMemory: 4  },
    high:   { triangles: 25000, materials: 3, bones: 0, textureSize: '2048x2048', textureMemory: 16 },
  },
  weapon:      {
    mobile: { triangles: 1500,  materials: 1, bones: 5,  textureSize: '512x512',   textureMemory: 1  },
    mid:    { triangles: 6000,  materials: 1, bones: 10, textureSize: '1024x1024', textureMemory: 4  },
    high:   { triangles: 20000, materials: 2, bones: 15, textureSize: '2048x2048', textureMemory: 16 },
  },
  environment: {
    mobile: { triangles: 5000,  materials: 1, bones: 0, textureSize: '512x512',   textureMemory: 1  },
    mid:    { triangles: 15000, materials: 2, bones: 0, textureSize: '1024x1024', textureMemory: 4  },
    high:   { triangles: 50000, materials: 3, bones: 0, textureSize: '2048x2048', textureMemory: 16 },
  },
};

const ASSET_CLASS_KEYWORDS: Record<AssetClass, string[]> = {
  character:   ['knight','warrior','mage','archer','hero','npc','player','human','elf','dwarf','barbarian','paladin'],
  creature:    ['dragon','goblin','slime','beast','monster','boss','demon','orc','troll','werewolf','zombie','spider'],
  prop:        ['tree','rock','chest','torch','altar','door','chair','table','barrel','crate','lantern','statue'],
  weapon:      ['sword','bow','rifle','staff','hammer','gun','axe','spear','dagger','mace','crossbow','blade'],
  environment: ['tavern','castle','dungeon','bridge','tower','temple','village','forest','cave','ruins','city','house'],
};

function classifyAsset(input: string): AssetClass {
  const lower = input.toLowerCase();
  for (const [cls, keywords] of Object.entries(ASSET_CLASS_KEYWORDS) as [AssetClass, string[]][]) {
    if (keywords.some((k: string) => lower.includes(k))) return cls;
  }
  if (lower.includes('character') || lower.includes('humanoid')) return 'character';
  if (lower.includes('creature')  || lower.includes('monster'))  return 'creature';
  if (lower.includes('weapon')    || lower.includes('arm'))      return 'weapon';
  if (lower.includes('environment') || lower.includes('modular')) return 'environment';
  return 'prop';
}

function extractStyle(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes('realistic') || lower.includes('photorealistic')) return 'realistic PBR';
  if (lower.includes('stylized')  || lower.includes('cartoon'))        return 'stylized PBR';
  if (lower.includes('hand-painted'))                                   return 'hand-painted PBR';
  if (lower.includes('sci-fi')    || lower.includes('scifi'))          return 'sci-fi PBR';
  if (lower.includes('fantasy'))                                        return 'fantasy PBR';
  if (lower.includes('lowpoly'))                                        return 'low-poly stylized';
  return 'semi-stylized realtime PBR';
}

function buildHeuristicSpec(input: string, assetClass: AssetClass, style: string): AssetSpecification {
  const budgets = PLATFORM_BUDGETS[assetClass];
  const isAnimated = ['character', 'creature'].includes(assetClass);
  const assetName = input.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return {
    assetName,
    assetClass,
    usage: `Primary ${assetClass} asset for real-time game`,
    style,
    platformProfiles: budgets,
    dimensions: {
      unit: 'meters',
      height: isAnimated ? 1.8 : 1.0,
      width:  isAnimated ? 0.6 : 1.0,
      depth:  isAnimated ? 0.4 : 1.0,
    },
    topology: {
      meshType: isAnimated ? 'Organic deformable mesh' : 'Hard surface mesh',
      triangleBudget: { mobile: budgets.mobile.triangles, mid: budgets.mid.triangles, high: budgets.high.triangles },
      deformationZones: isAnimated ? ['shoulders', 'elbows', 'knees'] : [],
      hardSurfaceRules: ['No ngons', 'Beveled edges'],
      organicRules: isAnimated ? ['Edge loops at joints'] : [],
    },
    uv: { uvSets: 2, mirroringAllowed: true, texelDensity: '512px/m', seamRules: ['Seams in non-visible areas'] },
    materials: {
      count: budgets.mid.materials,
      workflow: 'PBR metallic-roughness',
      maps: ['Albedo', 'Normal', 'MetallicRoughness', 'AO'],
      channels: { Albedo: 'RGB+A', Normal: 'RGB' },
    },
    rig: {
      required: isAnimated,
      type: isAnimated ? 'Humanoid biped' : 'None',
      boneCountTargets: { mobile: budgets.mobile.bones, mid: budgets.mid.bones, high: budgets.high.bones },
      bones: isAnimated ? ['Root', 'Hips', 'Spine', 'Head'] : [],
      constraints: [],
      facial: {},
    },
    animations: {
      required: isAnimated,
      clips: isAnimated ? ['Idle', 'Walk', 'Run', 'Attack'] : [],
      looping: isAnimated ? ['Idle', 'Walk', 'Run'] : [],
      oneShots: isAnimated ? ['Attack', 'Death'] : [],
    },
    lods: {
      count: 4,
      strategy: '50% reduction per LOD',
      budgets: [
        { level: 'LOD0', triangles: budgets.high.triangles,                      materials: budgets.high.materials   },
        { level: 'LOD1', triangles: Math.floor(budgets.high.triangles * 0.5),    materials: budgets.mid.materials    },
        { level: 'LOD2', triangles: Math.floor(budgets.mid.triangles * 0.5),     materials: budgets.mobile.materials },
        { level: 'LOD3', triangles: Math.floor(budgets.mobile.triangles * 0.25), materials: 1                        },
      ],
    },
    collision: { type: 'Capsule', parts: ['body'] },
    attachments: { sockets: isAnimated ? [{ name: 'weapon_r', parent: 'Hand.R' }] : [] },
    export: { primaryFormat: 'GLB', secondaryFormats: ['FBX'], validation: ['No missing textures', 'Correct scale'] },
    fileContract: {
      rootFolder: `assets/${assetClass}s/`,
      requiredFiles: ['model.glb', 'textures/'],
      namingRules: ['snake_case'],
    },
    qa: {
      checklist: [
        'Pivot at origin', 'Scale applied', 'No duplicate vertices',
        'UV in 0-1 space', 'All normals outward', 'LOD transitions tested',
        'Collision validated', 'File size within budget', 'GLB validation passed',
        'All textures power-of-two',
      ],
      criticalChecks: ['Scale: 1 unit = 1 meter', 'LOD0 within budget'],
    },
    autoDecisions: [
      `Classified as "${assetClass}"`,
      `Style: "${style}"`,
      'Heuristic fallback used',
    ],
  };
}

export async function generateAssetSpecification(input: string): Promise<AssetSpecification> {
  const assetClass = classifyAsset(input);
  const style = extractStyle(input);

  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY ?? process.env.GEMINI_API_KEY ?? '';
    if (apiKey) {
      // @ts-ignore - Module might not be installed in all environments
      const genaiModule = await import('@google/genai').catch(() => null);
      if (!genaiModule) throw new Error('Module @google/genai not found');
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const GoogleGenerativeAI = (genaiModule as any).GoogleGenerativeAI;
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `Return ONLY valid JSON (no markdown) for 3D game asset: "${input}" (class:${assetClass}, style:${style}). Required fields: assetName,assetClass,usage,style,platformProfiles(mobile/mid/high each with triangles/materials/bones/textureSize/textureMemory),dimensions(unit/height/width/depth),topology(meshType/triangleBudget/deformationZones/hardSurfaceRules/organicRules),uv(uvSets/mirroringAllowed/texelDensity/seamRules),materials(count/workflow/maps/channels),rig(required/type/boneCountTargets/bones/constraints/facial),animations(required/clips/looping/oneShots),lods(count/strategy/budgets array),collision(type/parts),attachments(sockets array),export(primaryFormat/secondaryFormats/validation),fileContract(rootFolder/requiredFiles/namingRules),qa(checklist/criticalChecks),autoDecisions.`;
      const result = await model.generateContent(prompt);
      const text: string = result.response.text();
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned) as AssetSpecification;
      if (!parsed.autoDecisions) {
        parsed.autoDecisions = [`LLM-generated for "${input}"`];
      }
      return parsed;
    }
  } catch (err) {
    console.warn('[AssetBrain] LLM failed, using heuristics:', err);
  }

  return buildHeuristicSpec(input, assetClass, style);
}

export function generateVariants(spec: AssetSpecification): Record<string, Partial<AssetSpecification>> {
  const budgets = PLATFORM_BUDGETS[spec.assetClass];
  return {
    hero: {
      ...spec,
      topology: { ...spec.topology, triangleBudget: { mobile: budgets.mobile.triangles, mid: budgets.mid.triangles, high: budgets.high.triangles } },
      materials: { ...spec.materials, count: budgets.high.materials },
    },
    gameplay: {
      ...spec,
      topology: { ...spec.topology, triangleBudget: { mobile: Math.floor(budgets.mobile.triangles * 0.75), mid: Math.floor(budgets.mid.triangles * 0.75), high: Math.floor(budgets.high.triangles * 0.75) } },
      materials: { ...spec.materials, count: Math.max(1, budgets.mid.materials - 1) },
    },
    mobileweb: {
      ...spec,
      topology: { ...spec.topology, triangleBudget: { mobile: Math.floor(budgets.mobile.triangles * 0.5), mid: Math.floor(budgets.mid.triangles * 0.5), high: Math.floor(budgets.high.triangles * 0.5) } },
      materials: { ...spec.materials, count: 1 },
    },
  };
}
