import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "../../core/Database.js";
import { AssetBrainDatabase } from "../../modules/asset-brain/AssetBrainDatabase.js";
import { GLBRegistry } from "../../modules/asset-registry/GLBRegistry.js";
import { StudioAssetDatabase, type StudioRuntimeAssetKind } from "./StudioAssetDatabase.js";
import { StudioGameDataStore } from "./StudioGameDataStore.js";

const studio = new StudioGameDataStore();
const runtimeAssets = new StudioAssetDatabase(db);
const assetBrain = new AssetBrainDatabase(db);
const fileGlbRegistry = new GLBRegistry();

const GLB_TARGET_TYPES = [
  "monster_group",
  "npc_group",
  "npc_single",
  "object_group",
  "object_single",
] as const;

const RUNTIME_ASSET_KINDS = [
  "2d_sprite",
  "2d_atlas",
  "3d_glb",
  "3d_gltf",
  "texture",
  "audio",
  "other",
] as const;

const FORBIDDEN_PRESENTATION_KEYS = new Set([
  "tick",
  "tickid",
  "worldhash",
  "canonicalintent",
  "intenthash",
  "receivedorder",
  "logicalindex",
  "kappa",
  "authoritativeoutcome",
]);

function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

function assertPresentationOnly(value: unknown, path = "$presentation"): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertPresentationOnly(entry, `${path}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    if (FORBIDDEN_PRESENTATION_KEYS.has(normalized)) {
      throw new Error(`STUDIO_PRESENTATION_AUTHORITY_FIELD_BLOCKED:${path}.${key}`);
    }
    assertPresentationOnly(child, `${path}.${key}`);
  }
}

function internalAdminToken(): string | null {
  return process.env.ADMIN_PANEL_TOKEN?.trim() || process.env.GM_PANEL_TOKEN?.trim() || null;
}

async function internalAdminRequest(
  method: "GET" | "POST" | "DELETE",
  endpoint: string,
  body?: unknown
): Promise<unknown> {
  const token = internalAdminToken();
  if (!token) throw new Error("STUDIO_LIVE_EFFECT_REQUIRES_ADMIN_PANEL_TOKEN");
  const port = Number(process.env.PORT || 3000);
  const url = `http://127.0.0.1:${port}/api/admin/content${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      "x-admin-token": token,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed: unknown = text;
  try { parsed = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) {
    const detail = parsed && typeof parsed === "object" ? JSON.stringify(parsed) : String(parsed);
    throw new Error(`STUDIO_LIVE_EFFECT_HTTP_${response.status}:${detail}`);
  }
  return parsed;
}

async function getPresentationDocument() {
  return studio.readJson("visual/presentation_bindings.json");
}

async function setPresentationBinding(input: {
  bindingId: string;
  targetType: string;
  targetId: string;
  presentation2d?: Record<string, unknown> | null;
  presentation3d?: Record<string, unknown> | null;
  enabled?: boolean;
  expectedSha256?: string | null;
}) {
  assertPresentationOnly(input.presentation2d);
  assertPresentationOnly(input.presentation3d);
  const current = await getPresentationDocument();
  const doc = current.value as any;
  const bindings = Array.isArray(doc.bindings) ? [...doc.bindings] : [];
  const binding = {
    bindingId: String(input.bindingId).trim(),
    targetType: String(input.targetType).trim(),
    targetId: String(input.targetId).trim(),
    enabled: input.enabled ?? true,
    presentation2d: input.presentation2d ?? null,
    presentation3d: input.presentation3d ?? null,
  };
  if (!binding.bindingId || !binding.targetType || !binding.targetId) {
    throw new Error("STUDIO_PRESENTATION_BINDING_ID_TARGET_REQUIRED");
  }
  const index = bindings.findIndex((entry: any) => entry?.bindingId === binding.bindingId);
  if (index >= 0) bindings[index] = binding;
  else bindings.push(binding);
  bindings.sort((a: any, b: any) => String(a.bindingId).localeCompare(String(b.bindingId)));
  return studio.writeJson(
    "visual/presentation_bindings.json",
    { ...doc, bindings },
    input.expectedSha256 ?? current.sha256
  );
}

async function removePresentationBinding(bindingId: string, expectedSha256?: string | null) {
  const current = await getPresentationDocument();
  const doc = current.value as any;
  const bindings = Array.isArray(doc.bindings)
    ? doc.bindings.filter((entry: any) => entry?.bindingId !== bindingId)
    : [];
  return studio.writeJson(
    "visual/presentation_bindings.json",
    { ...doc, bindings },
    expectedSha256 ?? current.sha256
  );
}

async function activateDatabaseAsset(input: {
  assetId: string;
  bindingId: string;
  targetType: string;
  targetId: string;
  view: "2d" | "3d" | "both";
  scale?: number;
}) {
  const asset = await runtimeAssets.get(input.assetId);
  if (!asset || !asset.enabled) throw new Error("STUDIO_RUNTIME_ASSET_NOT_FOUND_OR_DISABLED");
  const next2d = input.view === "3d" ? null : {
    kind: asset.kind === "2d_atlas" ? "atlas" : "sprite",
    runtimeAssetId: asset.id,
    spriteUrl: asset.runtimeUri,
    scale: input.scale ?? 1,
  };
  const next3d = input.view === "2d" ? null : {
    kind: "model",
    runtimeAssetId: asset.id,
    modelUrl: asset.runtimeUri,
    scale: input.scale ?? 1,
  };
  const receipt = await setPresentationBinding({
    bindingId: input.bindingId,
    targetType: input.targetType,
    targetId: input.targetId,
    presentation2d: next2d,
    presentation3d: next3d,
  });

  let live3d: unknown = null;
  if ((input.view === "3d" || input.view === "both") && (asset.kind === "3d_glb" || asset.kind === "3d_gltf")) {
    if ((GLB_TARGET_TYPES as readonly string[]).includes(input.targetType)) {
      try {
        live3d = await internalAdminRequest("POST", "/glb-links", {
          glbPath: asset.runtimeUri,
          targetType: input.targetType,
          targetId: input.targetId,
        });
      } catch (error) {
        live3d = { applied: false, reason: error instanceof Error ? error.message : String(error) };
      }
    }
  }

  return { asset, presentationReceipt: receipt, live3d };
}

export function registerStudioMcpTools(mcpServer: McpServer): void {
  mcpServer.tool(
    "studio_capabilities",
    "Describe Areloria Studio editing capabilities and truth boundaries.",
    {},
    async () => json({
      schemaVersion: "areloria.studio-capabilities.v1",
      transport: "existing Areloria admin MCP",
      noSecondGameServer: true,
      gameplayTruth: "server authoritative tick/canonical-intent/world-hash path remains authoritative",
      contentDomains: await studio.listDomains(),
      tools: {
        content: ["list/read/write/upsert/delete/validate JSON under game-data"],
        assets: ["filesystem GLB scan", "Asset Brain specifications", "database runtime asset catalog"],
        presentation: ["2D sprite/atlas bindings", "3D GLB/glTF bindings", "per-target hot selection"],
        rendering: ["2D and 3D render profiles"],
        liveEffects: ["GLB link switch", "asset-pool reload", "world placement/remove"],
      },
      liveEffectsRequire: "ADMIN_PANEL_TOKEN or GM_PANEL_TOKEN in server environment; secret value is never returned",
    })
  );

  mcpServer.tool(
    "studio_list_domains",
    "List editable authored game-data domains (quests, NPCs, monsters, economy, politics, trade, UI, world, etc.).",
    {},
    async () => json(await studio.listDomains())
  );

  mcpServer.tool(
    "studio_list_json",
    "List JSON files inside one game-data domain.",
    {
      directory: z.string().default("."),
      maxDepth: z.number().int().min(0).max(8).default(4),
    },
    async ({ directory, maxDepth }) => {
      try { return json(await studio.listJsonFiles(directory, maxDepth)); }
      catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_read_json",
    "Read one game-data JSON document with SHA-256 for optimistic write locking.",
    { relativePath: z.string() },
    async ({ relativePath }) => {
      try { return json(await studio.readJson(relativePath)); }
      catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_write_json",
    "Replace one authored game-data JSON document atomically and return write/readback hashes. Truth-index files are blocked.",
    {
      relativePath: z.string(),
      value: z.any(),
      expectedSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
    },
    async ({ relativePath, value, expectedSha256 }) => {
      try { return json(await studio.writeJson(relativePath, value, expectedSha256)); }
      catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_upsert_json_entry",
    "Insert or replace one entry in an authored JSON array/object using an ID/key.",
    {
      relativePath: z.string(),
      key: z.string(),
      keyField: z.string().default("id"),
      value: z.any(),
      expectedSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
    },
    async (args) => {
      try { return json(await studio.upsertEntry(args)); }
      catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_delete_json_entry",
    "Delete one authored JSON array/object entry by ID/key with hash-bound readback.",
    {
      relativePath: z.string(),
      key: z.string(),
      keyField: z.string().default("id"),
      expectedSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
    },
    async (args) => {
      try { return json(await studio.deleteEntry(args)); }
      catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_validate_content",
    "Run the canonical game-data content validator after authored changes.",
    {},
    async () => json(studio.validate())
  );

  mcpServer.tool(
    "studio_scan_3d_models",
    "Scan the current client model library for GLB/glTF files.",
    {},
    async () => {
      try { return json({ models: fileGlbRegistry.scanModels() }); }
      catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_asset_brain_get",
    "Read an existing Asset Brain specification from PostgreSQL by ID.",
    { specificationId: z.string() },
    async ({ specificationId }) => {
      try {
        const specification = await assetBrain.getSpecification(specificationId);
        const variants = specification ? await assetBrain.getVariants(specificationId) : [];
        return json({ specification, variants });
      } catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_runtime_asset_list",
    "List database-backed renderable assets that can be bound to 2D or 3D targets.",
    {
      kind: z.enum(RUNTIME_ASSET_KINDS).optional(),
      includeDisabled: z.boolean().default(false),
    },
    async ({ kind, includeDisabled }) => {
      try { return json(await runtimeAssets.list(kind as StudioRuntimeAssetKind | undefined, includeDisabled)); }
      catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_runtime_asset_upsert",
    "Create/update a database runtime asset URI with optional content hash and Asset Brain provenance.",
    {
      id: z.string(),
      kind: z.enum(RUNTIME_ASSET_KINDS),
      runtimeUri: z.string(),
      contentSha256: z.string().regex(/^[a-f0-9]{64}$/i).nullable().optional(),
      sourceSpecificationId: z.string().nullable().optional(),
      label: z.string().nullable().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
      enabled: z.boolean().optional(),
    },
    async (args) => {
      try { return json(await runtimeAssets.upsert(args as any)); }
      catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_runtime_asset_delete",
    "Delete one database runtime asset catalog entry. This does not delete the underlying binary file.",
    { id: z.string() },
    async ({ id }) => {
      try { return json({ removed: await runtimeAssets.remove(id) }); }
      catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_presentation_get",
    "Read the shared 2D/3D presentation binding document with SHA-256.",
    {},
    async () => {
      try { return json(await getPresentationDocument()); }
      catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_presentation_set_binding",
    "Bind one semantic game target to independent 2D and/or 3D presentation assets without changing gameplay truth.",
    {
      bindingId: z.string(),
      targetType: z.string(),
      targetId: z.string(),
      presentation2d: z.record(z.string(), z.any()).nullable().optional(),
      presentation3d: z.record(z.string(), z.any()).nullable().optional(),
      enabled: z.boolean().optional(),
      expectedSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
    },
    async (args) => {
      try { return json(await setPresentationBinding(args)); }
      catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_presentation_remove_binding",
    "Remove one 2D/3D presentation binding by bindingId.",
    {
      bindingId: z.string(),
      expectedSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
    },
    async ({ bindingId, expectedSha256 }) => {
      try { return json(await removePresentationBinding(bindingId, expectedSha256)); }
      catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_activate_database_asset",
    "Select a database runtime asset for a semantic target and write the shared 2D/3D presentation binding. Compatible 3D targets are also hot-linked through the live admin content API when available.",
    {
      assetId: z.string(),
      bindingId: z.string(),
      targetType: z.string(),
      targetId: z.string(),
      view: z.enum(["2d", "3d", "both"]),
      scale: z.number().positive().max(100).optional(),
    },
    async (args) => {
      try { return json(await activateDatabaseAsset(args)); }
      catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_render_profiles_get",
    "Read active 2D/3D render-quality profiles and all profile definitions.",
    {},
    async () => {
      try { return json(await studio.readJson("visual/render_profiles.json")); }
      catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_render_profile_set",
    "Create/update a named 2D/3D render profile. Presentation settings may not contain gameplay-authority fields.",
    {
      profileName: z.string(),
      client2d: z.record(z.string(), z.any()).optional(),
      client3d: z.record(z.string(), z.any()).optional(),
      expectedSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
    },
    async ({ profileName, client2d, client3d, expectedSha256 }) => {
      try {
        assertPresentationOnly(client2d);
        assertPresentationOnly(client3d);
        const current = await studio.readJson("visual/render_profiles.json");
        const doc = current.value as any;
        const profiles = { ...(doc.profiles ?? {}) };
        profiles[profileName] = {
          ...(profiles[profileName] ?? {}),
          ...(client2d ? { client2d } : {}),
          ...(client3d ? { client3d } : {}),
        };
        return json(await studio.writeJson(
          "visual/render_profiles.json",
          { ...doc, profiles },
          expectedSha256 ?? current.sha256
        ));
      } catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_render_profile_activate",
    "Switch the active render profile independently for the 2D and/or 3D client.",
    {
      client: z.enum(["client2d", "client3d", "both"]),
      profileName: z.string(),
      expectedSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
    },
    async ({ client, profileName, expectedSha256 }) => {
      try {
        const current = await studio.readJson("visual/render_profiles.json");
        const doc = current.value as any;
        if (!doc.profiles?.[profileName]) throw new Error("STUDIO_RENDER_PROFILE_NOT_FOUND");
        const active = { ...(doc.active ?? {}) };
        if (client === "client2d" || client === "both") active.client2d = profileName;
        if (client === "client3d" || client === "both") active.client3d = profileName;
        return json(await studio.writeJson(
          "visual/render_profiles.json",
          { ...doc, active },
          expectedSha256 ?? current.sha256
        ));
      } catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_live_glb_link_set",
    "Hot-switch a live 3D GLB target through the existing authenticated admin content runtime.",
    {
      glbPath: z.string(),
      targetType: z.enum(GLB_TARGET_TYPES),
      targetId: z.string(),
    },
    async (body) => {
      try { return json(await internalAdminRequest("POST", "/glb-links", body)); }
      catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_live_glb_link_remove",
    "Remove a live 3D GLB target binding through the existing admin runtime.",
    {
      targetType: z.enum(GLB_TARGET_TYPES),
      targetId: z.string(),
    },
    async ({ targetType, targetId }) => {
      try {
        return json(await internalAdminRequest(
          "DELETE",
          `/glb-links?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`
        ));
      } catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_live_asset_pools_get",
    "Read the active runtime model pools used for NPCs, monsters, objects, players and other visual categories.",
    {},
    async () => {
      try { return json(await internalAdminRequest("GET", "/asset-pools")); }
      catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_live_asset_pool_set",
    "Set one active runtime model-pool entry and read the resulting pool document back.",
    {
      category: z.string(),
      key: z.string(),
      paths: z.array(z.string()).min(1),
    },
    async ({ category, key, paths }) => {
      try { return json(await internalAdminRequest("POST", "/asset-pools/entry", { category, key, paths })); }
      catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_live_asset_pools_reload",
    "Reload runtime asset-pool configuration after authored/model changes.",
    {},
    async () => {
      try { return json(await internalAdminRequest("POST", "/asset-pools/reload", {})); }
      catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_live_world_place",
    "Validate and place a world asset through the existing placement engine (houses, structures, environment props, settlement pieces).",
    {
      id: z.string(),
      assetPath: z.string(),
      x: z.number(),
      y: z.number(),
      rotation: z.number().default(0),
      scale: z.number().positive().max(100).default(1),
      category: z.string().optional(),
      type: z.string().optional(),
      name: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    },
    async ({ x, y, ...rest }) => {
      try {
        return json(await internalAdminRequest("POST", "/placement/place", {
          ...rest,
          position: { x, y },
        }));
      } catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_live_world_remove",
    "Remove one runtime world placement through the existing placement engine.",
    { id: z.string() },
    async ({ id }) => {
      try { return json(await internalAdminRequest("DELETE", `/placement/${encodeURIComponent(id)}`)); }
      catch (error) { return errorResult(error); }
    }
  );

  mcpServer.tool(
    "studio_runtime_readback",
    "Read back Studio database, content validation, model library and live admin runtime state without exposing secrets.",
    {},
    async () => {
      try {
        const database = await runtimeAssets.health();
        const content = studio.validate();
        const models = fileGlbRegistry.scanModels();
        let live: unknown = null;
        try {
          const [meta, links, pools, placementHistory] = await Promise.all([
            internalAdminRequest("GET", "/meta"),
            internalAdminRequest("GET", "/glb-links"),
            internalAdminRequest("GET", "/asset-pools"),
            internalAdminRequest("GET", "/placement/history"),
          ]);
          live = { available: true, meta, links, pools, placementHistory };
        } catch (error) {
          live = { available: false, reason: error instanceof Error ? error.message : String(error) };
        }
        return json({
          schemaVersion: "areloria.studio-readback.v1",
          database,
          content,
          modelCount: models.length,
          live,
          secretValuesReturned: false,
        });
      } catch (error) { return errorResult(error); }
    }
  );
}
