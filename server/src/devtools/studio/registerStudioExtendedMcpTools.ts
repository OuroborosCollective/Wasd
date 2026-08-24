import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { StudioRepositoryStore } from "./StudioRepositoryStore.js";

const repository = new StudioRepositoryStore();

function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

function internalAdminToken(): string | null {
  return process.env.ADMIN_PANEL_TOKEN?.trim() || process.env.GM_PANEL_TOKEN?.trim() || null;
}

async function adminRequest(
  method: "GET" | "POST" | "DELETE",
  endpoint: string,
  body?: unknown,
): Promise<unknown> {
  const token = internalAdminToken();
  if (!token) throw new Error("STUDIO_LIVE_EFFECT_REQUIRES_ADMIN_PANEL_TOKEN");
  const port = Number(process.env.PORT || 3000);
  const response = await fetch(`http://127.0.0.1:${port}/api/admin/content${endpoint}`, {
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
  if (!response.ok) throw new Error(`STUDIO_LIVE_EFFECT_HTTP_${response.status}:${typeof parsed === "string" ? parsed : JSON.stringify(parsed)}`);
  return parsed;
}

const placementSchema = z.object({
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
});

export function registerStudioExtendedMcpTools(mcpServer: McpServer): void {
  mcpServer.tool(
    "studio_repo_read",
    "Read an editable repository source/config file with SHA-256. Secret/config credential files are blocked.",
    { relativePath: z.string() },
    async ({ relativePath }) => {
      try { return json(await repository.read(relativePath)); }
      catch (error) { return errorResult(error); }
    },
  );

  mcpServer.tool(
    "studio_repo_list",
    "List source/config files inside an allowed repository subtree without exposing .env files.",
    {
      directory: z.string(),
      maxDepth: z.number().int().min(0).max(8).default(3),
    },
    async ({ directory, maxDepth }) => {
      try { return json(await repository.list(directory, maxDepth)); }
      catch (error) { return errorResult(error); }
    },
  );

  mcpServer.tool(
    "studio_repo_write_text",
    "Create/replace one editable source/config file with optimistic SHA-256 locking and readback receipt. Requires build/runtime verification afterwards.",
    {
      relativePath: z.string(),
      content: z.string(),
      expectedSha256: z.string().regex(/^[a-f0-9]{64}$/i).nullable().optional(),
      create: z.boolean().default(false),
    },
    async ({ relativePath, content, expectedSha256, create }) => {
      try { return json(await repository.write({ relativePath, content, expectedSha256, create })); }
      catch (error) { return errorResult(error); }
    },
  );

  mcpServer.tool(
    "studio_repo_replace_text",
    "Replace an exact source/config fragment only when the expected file hash and occurrence count match.",
    {
      relativePath: z.string(),
      oldText: z.string(),
      newText: z.string(),
      expectedSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
      expectedOccurrences: z.number().int().min(1).max(1000).default(1),
    },
    async (args) => {
      try { return json(await repository.replace(args)); }
      catch (error) { return errorResult(error); }
    },
  );

  mcpServer.tool(
    "studio_live_world_batch_place",
    "Place a deterministic ordered batch of environment/building pieces through the existing placement engine. Optional rollback removes successfully placed IDs on the first failure.",
    {
      placements: z.array(placementSchema).min(1).max(500),
      rollbackOnFailure: z.boolean().default(true),
    },
    async ({ placements, rollbackOnFailure }) => {
      const placed: Array<{ id: string; result: unknown }> = [];
      try {
        for (const placement of placements) {
          const { x, y, ...rest } = placement;
          const result = await adminRequest("POST", "/placement/place", {
            ...rest,
            position: { x, y },
          });
          placed.push({ id: placement.id, result });
        }
        return json({
          schemaVersion: "areloria.studio-world-batch-receipt.v1",
          requested: placements.length,
          placed: placed.length,
          rolledBack: false,
          results: placed,
        });
      } catch (error) {
        const rollback: Array<{ id: string; removed: boolean; error?: string }> = [];
        if (rollbackOnFailure) {
          for (const item of [...placed].reverse()) {
            try {
              await adminRequest("DELETE", `/placement/${encodeURIComponent(item.id)}`);
              rollback.push({ id: item.id, removed: true });
            } catch (rollbackError) {
              rollback.push({ id: item.id, removed: false, error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError) });
            }
          }
        }
        return {
          isError: true,
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
              requested: placements.length,
              placedBeforeFailure: placed.length,
              rollbackOnFailure,
              rollback,
            }, null, 2),
          }],
        };
      }
    },
  );

  mcpServer.tool(
    "studio_live_world_batch_remove",
    "Remove multiple runtime world placements in deterministic ID order.",
    { ids: z.array(z.string()).min(1).max(500) },
    async ({ ids }) => {
      const results: Array<{ id: string; removed: boolean; error?: string }> = [];
      for (const id of [...ids].sort((a, b) => a.localeCompare(b))) {
        try {
          await adminRequest("DELETE", `/placement/${encodeURIComponent(id)}`);
          results.push({ id, removed: true });
        } catch (error) {
          results.push({ id, removed: false, error: error instanceof Error ? error.message : String(error) });
        }
      }
      return json({ results });
    },
  );

  mcpServer.tool(
    "studio_live_asset_pool_set_default",
    "Set the default GLB/model list for one live asset-pool category, then use studio_live_asset_pools_reload for readback activation.",
    {
      category: z.string(),
      paths: z.array(z.string()).min(1),
    },
    async ({ category, paths }) => {
      try { return json(await adminRequest("POST", "/asset-pools/default", { category, paths })); }
      catch (error) { return errorResult(error); }
    },
  );

  mcpServer.tool(
    "studio_live_content_preview",
    "Preview a game-data patch through the existing admin content preview engine before publishing it.",
    {
      baseVersion: z.number().int().nonnegative(),
      patches: z.array(z.any()).min(1),
      stagedBy: z.string().default("areloria-studio-mcp"),
    },
    async (body) => {
      try { return json(await adminRequest("POST", "/preview", body)); }
      catch (error) { return errorResult(error); }
    },
  );
}
