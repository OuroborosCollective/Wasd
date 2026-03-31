import express, { Router } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { randomUUID } from "node:crypto";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";

// Store SSE Transports for connecting clients
const transports = new Map<string, { transport: SSEServerTransport }>();

// --- Helper Functions ---
function getAdminToken(): string | undefined {
  const raw = process.env.MCP_ADMIN_TOKEN?.trim();
  return raw && raw.length > 0 ? raw : undefined;
}

/**
 * Validates that a filepath is within the project's root directory.
 * @param filepath The path to validate, relative to the project root.
 * @returns The resolved absolute path.
 * @throws Error if path traversal is detected.
 */
export function validatePath(filepath: string): string {
  if (!filepath || filepath.includes("\0")) {
    throw new Error("Invalid path");
  }
  const p = path.resolve(process.cwd(), filepath);
  // Ensure the resolved path is inside process.cwd()
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
  currentDepth = 0
): Promise<string[]> {
  if (currentDepth > maxDepth) {
    return [];
  }

  const entries = await fs.readdir(absoluteDirectoryPath, { withFileTypes: true });
  const sortedEntries = entries.sort((a, b) => a.name.localeCompare(b.name));
  const results: string[] = [];

  for (const entry of sortedEntries) {
    if (entry.name === ".git" || entry.name === "node_modules") {
      continue;
    }

    const fullPath = path.join(absoluteDirectoryPath, entry.name);
    const relativePath = path.relative(process.cwd(), fullPath).replaceAll(path.sep, "/");

    if (entry.isDirectory()) {
      if (includeDirectories) {
        results.push(`${relativePath}/`);
      }
      results.push(...(await listPaths(fullPath, maxDepth, includeDirectories, currentDepth + 1)));
      continue;
    }

    results.push(relativePath);
  }

  return results;
}

function getConnectionProfile() {
  return {
    websocketUrl:
      process.env.PUBLIC_WEBSOCKET_URL ||
      process.env.NEXT_PUBLIC_WEBSOCKET_URL ||
      "wss://<your-domain>/ws",
    mcpSseUrl: process.env.MCP_PUBLIC_SSE_URL || "https://<your-domain>/api/mcp/sse",
    mcpMessagesUrl:
      process.env.MCP_PUBLIC_MESSAGES_URL || "https://<your-domain>/api/mcp/messages?sessionId=<id>",
    notes: [
      "Set MCP_ADMIN_TOKEN in your server environment.",
      "Use Bearer auth in Cursor MCP server headers.",
      "For Nginx, disable proxy buffering on /api/mcp/sse.",
    ],
  };
}

function createMcpServer() {
  const mcpServer = new McpServer({
    name: "Areloria Game Server MCP",
    version: "1.1.0",
  });

  // 1. Read files
  mcpServer.tool(
    "read_file",
    "Read code, configs or data files from the game server. Admins only.",
    { filepath: z.string().describe("Path to the file relative to project root") },
    async ({ filepath }) => {
      try {
        const p = validatePath(filepath);
        const data = await fs.readFile(p, "utf-8");
        return { content: [{ type: "text", text: data }] };
      } catch (e: any) {
        return { isError: true, content: [{ type: "text", text: `Error reading file: ${e.message}` }] };
      }
    }
  );

  // 2. Write files
  mcpServer.tool(
    "write_file",
    "Write to code, config or data files on the game server. Admins only.",
    {
      filepath: z.string().describe("Path to the file relative to project root"),
      content: z.string().describe("New content of the file"),
    },
    async ({ filepath, content }) => {
      try {
        const p = validatePath(filepath);
        await fs.writeFile(p, content, "utf-8");
        return { content: [{ type: "text", text: `Successfully wrote to ${filepath}` }] };
      } catch (e: any) {
        return { isError: true, content: [{ type: "text", text: `Error writing file: ${e.message}` }] };
      }
    }
  );

  // 3. List files
  mcpServer.tool(
    "list_files",
    "List project files for MMORPG and PlayCanvas integration work.",
    {
      directory: z.string().default(".").describe("Directory path relative to project root"),
      maxDepth: z.number().int().min(0).max(8).default(3),
      includeDirectories: z.boolean().default(false),
    },
    async ({ directory, maxDepth, includeDirectories }) => {
      try {
        const absoluteDirectoryPath = validatePath(directory);
        const paths = await listPaths(absoluteDirectoryPath, maxDepth, includeDirectories);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ directory, count: paths.length, paths }, null, 2),
            },
          ],
        };
      } catch (e: any) {
        return { isError: true, content: [{ type: "text", text: `Error listing files: ${e.message}` }] };
      }
    }
  );

  // 4. PlayCanvas + MMORPG connection profile
  mcpServer.tool(
    "get_playcanvas_connection_profile",
    "Return recommended WebSocket and MCP endpoint settings for PlayCanvas MMORPG deployment.",
    {},
    async () => {
      return { content: [{ type: "text", text: JSON.stringify(getConnectionProfile(), null, 2) }] };
    }
  );

  return mcpServer;
}

// --- Express Route Setup ---

export function mcpRoute() {
  const router = Router();
  router.use(express.json()); // Need body parser for message POST

  // Auth Middleware
  router.use((req, res, next) => {
    const adminToken = getAdminToken();
    if (!adminToken) {
      console.error("[MCP] Refusing request because MCP_ADMIN_TOKEN is not configured");
      res.status(503).json({ error: "MCP is not configured on this server (missing MCP_ADMIN_TOKEN)" });
      return;
    }

    // Basic Bearer Token Auth
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("[MCP] Unauthorized attempt: Missing Bearer Token");
      res.status(401).json({ error: "Missing or invalid Bearer token" });
      return;
    }

    const token = authHeader.split(" ")[1];
    if (token !== adminToken) {
      console.warn("[MCP] Unauthorized attempt: Invalid Bearer Token");
      res.status(403).json({ error: "Forbidden: Invalid Admin Token" });
      return;
    }

    next();
  });

  // SSE Endpoint to establish connection
  router.get("/sse", async (req, res) => {
    try {
      const requestedSessionId = typeof req.query.sessionId === "string" ? req.query.sessionId.trim() : "";
      const sessionId = requestedSessionId || randomUUID();
      console.log(`[MCP Admin] Establishing SSE Connection. Session ID: ${sessionId}`);

      // Helpful when running behind Nginx or other reverse proxies.
      res.setHeader("X-Accel-Buffering", "no");

      const endpoint = `/api/mcp/messages?sessionId=${encodeURIComponent(sessionId)}`;

      const transport = new SSEServerTransport(endpoint, res as any);
      const mcpServer = createMcpServer();
      transports.set(sessionId, { transport });

      res.on("close", () => {
        console.log(`[MCP Admin] Connection closed for session: ${sessionId}`);
        transports.delete(sessionId);
      });

      await mcpServer.connect(transport);
    } catch (err: any) {
      console.error("[MCP] Setup error", err);
      if (!res.headersSent) res.status(500).send(err.message);
    }
  });

  // Message POST endpoint for sending RPC requests to the established SSE transport
  router.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId as string;

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
      console.error("[MCP] Message handling error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
