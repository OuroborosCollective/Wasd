import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { mcpRoute } from "../api/mcpRoute.js";

describe("MCP Router Authorization and Timing Attack Mitigation", () => {
  beforeEach(() => {
    delete process.env.MCP_ADMIN_TOKEN;
  });

  afterEach(() => {
    delete process.env.MCP_ADMIN_TOKEN;
  });

  it("should fail with 503 if MCP_ADMIN_TOKEN is not configured", async () => {
    const app = express();
    app.use("/api/mcp", mcpRoute());

    const response = await request(app)
      .post("/api/mcp/messages")
      .set("Authorization", "Bearer token");

    expect(response.status).toBe(503);
    expect(response.body.error).toContain("missing MCP_ADMIN_TOKEN");
  });

  it("should fail with 401 if Authorization header is missing or malformed", async () => {
    process.env.MCP_ADMIN_TOKEN = "secure-mcp-admin-token";
    const app = express();
    app.use("/api/mcp", mcpRoute());

    const r1 = await request(app).post("/api/mcp/messages");
    expect(r1.status).toBe(401);
    expect(r1.body.error).toContain("Missing or invalid Bearer token");

    const r2 = await request(app)
      .post("/api/mcp/messages")
      .set("Authorization", "Basic c29tZXRoaW5n");
    expect(r2.status).toBe(401);
  });

  it("should fail with 403 if an incorrect token is provided", async () => {
    process.env.MCP_ADMIN_TOKEN = "secure-mcp-admin-token";
    const app = express();
    app.use("/api/mcp", mcpRoute());

    const response = await request(app)
      .post("/api/mcp/messages")
      .set("Authorization", "Bearer wrong-token");

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("Forbidden");
  });

  it("should pass authorization middleware if the correct token is provided", async () => {
    process.env.MCP_ADMIN_TOKEN = "secure-mcp-admin-token";
    const app = express();
    app.use("/api/mcp", mcpRoute());

    const response = await request(app)
      .post("/api/mcp/messages")
      .set("Authorization", "Bearer secure-mcp-admin-token");

    // Authorization succeeds, and then it fails at the handler level because sessionId is missing
    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Missing sessionId query parameter");
  });
});
