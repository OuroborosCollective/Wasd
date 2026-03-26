import express, { Router } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";

// Create MCP server instance
const mcpServer = new McpServer({
  name: "Areloria Game Server MCP",
  version: "1.0.0",
});

// Store SSE Transports for connecting clients
const transports = new Map<string, SSEServerTransport>();

// --- Helper Functions ---
function getAdminToken() {
  return process.env.MCP_ADMIN_TOKEN || "areloria-admin-secret-dev-token";
}

/**
 * Validates that a filepath is within the project's root directory.
 * @param filepath The path to validate, relative to the project root.
 * @returns The resolved absolute path.
 * @throws Error if path traversal is detected.
 */
export function validatePath(filepath: string): string {
  const p = path.resolve(process.cwd(), filepath);
  // Ensure the resolved path is inside process.cwd()
  const relative = path.relative(process.cwd(), p);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path traversal attempt detected: ${filepath}`);
  }
  return p;
}

// --- Define MCP Tools ---

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
    content: z.string().describe("New content of the file")
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

<<<<<<< HEAD
=======
// 3. Eval Script (Execute arbitrary JS on the server)
mcpServer.tool(
  "eval_script",
  "Execute arbitrary JS on the running server to inspect memory, state, or fix bugs on the fly. Dangerous. Use with caution.",
  { code: z.string().describe("The javascript code to evaluate in the global context") },
  async ({ code }) => {
    try {
      // Very dangerous! For Admin MCPs only!
      const result = await eval(`(async () => { ${code} })()`);
      return { content: [{ type: "text", text: `Eval success:\n${JSON.stringify(result, null, 2)}` }] };
    } catch (e: any) {
      return { isError: true, content: [{ type: "text", text: `Eval error: ${e.message}\n${e.stack}` }] };
    }
  }
);

>>>>>>> main
// --- Express Route Setup ---

export function mcpRoute() {
  const router = Router();
  router.use(express.json()); // Need body parser for message POST

  // Auth Middleware
  router.use((req, res, next) => {
    // Basic Bearer Token Auth
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("[MCP] Unauthorized attempt: Missing Bearer Token");
      res.status(401).json({ error: "Missing or invalid Bearer token" });
      return;
    }

    const token = authHeader.split(" ")[1];
    if (token !== getAdminToken()) {
      console.warn("[MCP] Unauthorized attempt: Invalid Bearer Token");
      res.status(403).json({ error: "Forbidden: Invalid Admin Token" });
      return;
    }

    next();
  });

  // SSE Endpoint to establish connection
  router.get("/sse", async (req, res) => {
    try {
      const sessionId = (req.query.sessionId as string) || Math.random().toString(36).substring(7);
      console.log(`[MCP Admin] Establishing SSE Connection. Session ID: ${sessionId}`);

      const endpoint = `/api/mcp/messages?sessionId=${sessionId}`;

      const transport = new SSEServerTransport(endpoint, res as any);
      transports.set(sessionId, transport);

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

    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: "Transport not found for this session" });
      return;
    }

    try {
      await transport.handlePostMessage(req as any, res as any);
    } catch (err: any) {
      console.error("[MCP] Message handling error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
