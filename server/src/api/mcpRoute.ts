import express, { Router } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID, createHash, timingSafeEqual } from "node:crypto";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { registerGenkitGameplayOperatorMcpTools } from "../devtools/genkit/registerGameplayOperatorMcpTools.js";
import { registerStudioMcpTools } from "../devtools/studio/registerStudioMcpTools.js";
import { registerStudioExtendedMcpTools } from "../devtools/studio/registerStudioExtendedMcpTools.js";
import { StudioGameDataStore } from "../devtools/studio/StudioGameDataStore.js";

const transports = new Map<string, { transport: SSEServerTransport }>();
const publicStudioStore = new StudioGameDataStore();

function getAdminToken(): string | undefined {
  const raw = process.env.MCP_ADMIN_TOKEN?.trim();
  return raw && raw.length > 0 ? raw : undefined;
}

function hashBuffer(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function safeEqualText(a: string, b: string): boolean {
  const left = hashBuffer(a);
  const right = hashBuffer(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function validatePath(filepath: string): string {
  if (!filepath || filepath.includes("\0")) throw new Error("Invalid path");
  const p = path.resolve(process.cwd(), filepath);
  const relative = path.relative(process.cwd(), p);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path traversal attempt detected: ${filepath}`);
  }
  return p;
}

async function listPaths(
  absoluteDirectoryPath: string,
  maxDepth: number,
  includeDirectories: boolean,
  currentDepth = 0,
): Promise<string[]> {
  if (currentDepth > maxDepth) return [];
  const entries = (await fs.readdir(absoluteDirectoryPath, { withFileTypes: true }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const results: string[] = [];
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const fullPath = path.join(absoluteDirectoryPath, entry.name);
    const relativePath = path.relative(process.cwd(), fullPath).replaceAll(path.sep, "/");
    if (entry.isDirectory()) {
      if (includeDirectories) results.push(`${relativePath}/`);
      results.push(...(await listPaths(fullPath, maxDepth, includeDirectories, currentDepth + 1)));
    } else {
      results.push(relativePath);
    }
  }
  return results;
}

function getConnectionProfile() {
  return {
    websocketUrl:
      process.env.PUBLIC_WEBSOCKET_URL ||
      process.env.NEXT_PUBLIC_WEBSOCKET_URL ||
      "wss://<your-domain>/ws",
    mcpStreamableHttpUrl: process.env.MCP_PUBLIC_HTTP_URL || "https://<your-domain>/api/mcp",
    mcpSseUrl: process.env.MCP_PUBLIC_SSE_URL || "https://<your-domain>/api/mcp/sse",
    mcpMessagesUrl:
      process.env.MCP_PUBLIC_MESSAGES_URL || "https://<your-domain>/api/mcp/messages?sessionId=<id>",
    presentationConfigUrl: process.env.STUDIO_PRESENTATION_PUBLIC_URL || "/api/mcp/presentation-config",
    notes: [
      "Set MCP_ADMIN_TOKEN in your server environment.",
      "Use Bearer auth in MCP client headers.",
      "Prefer the Streamable HTTP endpoint at /api/mcp; legacy SSE remains for compatibility.",
      "Genkit gameplay tools execute only allowlisted server-authoritative actions and require follow-up readback.",
      "Live Studio effects additionally reuse ADMIN_PANEL_TOKEN or GM_PANEL_TOKEN internally.",
      "Areloria Studio uses the existing game MCP/server; no second NPC/game server is required.",
    ],
  };
}

function createMcpServer() {
  const mcpServer = new McpServer({ name: "Areloria Game Server MCP", version: "1.5.0" });

  mcpServer.tool(
    "read_file",
    "Read code, configs or data files from the game server. Admins only.",
    { filepath: z.string().describe("Path to the file relative to project root") },
    async ({ filepath }) => {
      try {
        const data = await fs.readFile(validatePath(filepath), "utf-8");
        return { content: [{ type: "text" as const, text: data }] };
      } catch (e: any) {
        return { isError: true, content: [{ type: "text" as const, text: `Error reading file: ${e.message}` }] };
      }
    },
  );

  mcpServer.tool(
    "write_file",
    "Legacy low-level file write. Prefer studio_repo_write_text or typed game-data tools for hash-bound writes.",
    {
      filepath: z.string().describe("Path to the file relative to project root"),
      content: z.string().describe("New content of the file"),
    },
    async ({ filepath, content }) => {
      try {
        await fs.writeFile(validatePath(filepath), content, "utf-8");
        return { content: [{ type: "text" as const, text: `Successfully wrote to ${filepath}` }] };
      } catch (e: any) {
        return { isError: true, content: [{ type: "text" as const, text: `Error writing file: ${e.message}` }] };
      }
    },
  );

  mcpServer.tool(
    "list_files",
    "List project files for MMORPG client and server work.",
    {
      directory: z.string().default(".").describe("Directory path relative to project root"),
      maxDepth: z.number().int().min(0).max(8).default(3),
      includeDirectories: z.boolean().default(false),
    },
    async ({ directory, maxDepth, includeDirectories }) => {
      try {
        const paths = await listPaths(validatePath(directory), maxDepth, includeDirectories);
        return { content: [{ type: "text" as const, text: JSON.stringify({ directory, count: paths.length, paths }, null, 2) }] };
      } catch (e: any) {
        return { isError: true, content: [{ type: "text" as const, text: `Error listing files: ${e.message}` }] };
      }
    },
  );

  mcpServer.tool(
    "get_game_connection_profile",
    "Return WebSocket, MCP and Studio presentation endpoint settings for Areloria.",
    {},
    async () => ({ content: [{ type: "text" as const, text: JSON.stringify(getConnectionProfile(), null, 2) }] }),
  );

  registerGenkitGameplayOperatorMcpTools(mcpServer);
  registerStudioMcpTools(mcpServer);
  registerStudioExtendedMcpTools(mcpServer);
  return mcpServer;
}

export function mcpRoute() {
  const router = Router();
  router.use(express.json());

  // Read-only projection configuration used by both 2D and 3D clients.
  // No secrets, admin capability, persistence credentials or gameplay state are exposed here.
  router.get("/presentation-config", async (_req, res) => {
    try {
      const [presentation, renderProfiles] = await Promise.all([
        publicStudioStore.readJson("visual/presentation_bindings.json"),
        publicStudioStore.readJson("visual/render_profiles.json"),
      ]);
      res.setHeader("Cache-Control", "no-store");
      res.json({
        schemaVersion: "areloria.presentation-config-feed.v1",
        presentation: presentation.value,
        presentationSha256: presentation.sha256,
        renderProfiles: renderProfiles.value,
        renderProfilesSha256: renderProfiles.sha256,
      });
    } catch (error: any) {
      res.status(503).json({ error: "presentation_config_unavailable", message: String(error?.message || error) });
    }
  });

  // All MCP/admin mutation surfaces below are fail-closed behind the MCP owner token.
  router.use((req, res, next) => {
    const adminToken = getAdminToken();
    if (!adminToken) {
      res.status(503).json({ error: "MCP is not configured on this server (missing MCP_ADMIN_TOKEN)" });
      return;
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid Bearer token" });
      return;
    }
    const token = authHeader.slice(7).trim();
    if (!token || !safeEqualText(token, adminToken)) {
      res.status(403).json({ error: "Forbidden: Invalid Admin Token" });
      return;
    }
    next();
  });

  // Modern remote MCP transport. A fresh stateless transport/server pair is
  // constructed for every request; no MCP transport instance is reused across
  // requests. This keeps the endpoint request-scoped and avoids cross-session
  // transport state leaking into gameplay/operator calls.
  router.all("/", async (req, res) => {
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      const mcpServer = createMcpServer();
      await mcpServer.connect(transport);
      await transport.handleRequest(req as any, res as any, req.body);
    } catch (err: any) {
      console.error("[MCP Streamable HTTP] Request failed", err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "MCP Streamable HTTP request failed" },
          id: null,
        });
      }
    }
  });

  // Legacy HTTP+SSE compatibility transport.
  router.get("/sse", async (req, res) => {
    try {
      const requestedSessionId = typeof req.query.sessionId === "string" ? req.query.sessionId.trim() : "";
      const sessionId = requestedSessionId || randomUUID();
      res.setHeader("X-Accel-Buffering", "no");
      const endpoint = `/api/mcp/messages?sessionId=${encodeURIComponent(sessionId)}`;
      const transport = new SSEServerTransport(endpoint, res as any);
      const mcpServer = createMcpServer();
      transports.set(sessionId, { transport });
      res.on("close", () => transports.delete(sessionId));
      await mcpServer.connect(transport);
    } catch (err: any) {
      console.error("[MCP] Setup error", err);
      if (!res.headersSent) res.status(500).send(err.message);
    }
  });

  router.post("/messages", async (req, res) => {
    const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : "";
    if (!sessionId) {
      res.status(400).json({ error: "Missing sessionId query parameter" });
      return;
    }
    const sessionState = transports.get(sessionId);
    if (!sessionState) {
      res.status(404).json({ error: "Transport not found for this session" });
      return;
    }
    try {
      await sessionState.transport.handlePostMessage(req as any, res as any);
    } catch (err: any) {
      console.error("[MCP] Message handling error", err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
