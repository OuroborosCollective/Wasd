import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the auth middleware before imports
vi.mock("../middleware/authMiddleware.js", () => ({
  authMiddleware: (req, res, next) => {
    req.playerId = req.headers["x-player-id"] || "test-player-123";
    next();
  },
}));

// Mock the database environment variables and the pg pool before any other imports
vi.mock("../core/Database.js", () => ({
  db: {
    query: vi.fn(),
    getClient: vi.fn(),
  },
  dbService: {
    query: vi.fn(),
    getClient: vi.fn(),
  },
}));

import request from "supertest";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createGLBUploadRouter } from "../api/glbUploadRoute.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// /app/server/src/tests -> /app/server/public/uploads/glb
const TEST_UPLOAD_DIR = path.resolve(__dirname, "../../public/uploads/glb");

const mockDb = {
  query: vi.fn(),
  getClient: vi.fn()
};

const app = express();
app.use(express.json());

app.use("/api/glb", createGLBUploadRouter(mockDb));

describe("GLB Upload Route Security Fix", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    if (fs.existsSync(TEST_UPLOAD_DIR)) {
        const files = fs.readdirSync(TEST_UPLOAD_DIR);
        for (const file of files) {
            fs.unlinkSync(path.join(TEST_UPLOAD_DIR, file));
        }
    } else {
        fs.mkdirSync(TEST_UPLOAD_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_UPLOAD_DIR)) {
        const files = fs.readdirSync(TEST_UPLOAD_DIR);
        for (const file of files) {
            fs.unlinkSync(path.join(TEST_UPLOAD_DIR, file));
        }
    }
  });

  it("should block files with valid extensions but invalid content (malicious script spoofed as glb)", async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [{ glb_enabled: true, glb_subscription_expires: new Date(Date.now() + 1000000).toISOString() }]
    });

    const maliciousContent = Buffer.from("<script>alert('xss')</script>");

    const response = await request(app)
      .post("/api/glb/upload")
      .set("x-player-id", "test-player-123")
      .attach("model", maliciousContent, { filename: "malicious.glb" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid GLB/GLTF file content");

    const files = fs.readdirSync(TEST_UPLOAD_DIR);
    expect(files.length).toBe(0);
  });

  it("should allow a valid basic gltf file", async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [{ glb_enabled: true, glb_subscription_expires: new Date(Date.now() + 1000000).toISOString() }]
    });

    // Mock DB query for count check
    mockDb.query.mockResolvedValueOnce({ rows: [{ cnt: 0 }] });

    // Mock DB query for INSERT
    mockDb.query.mockResolvedValueOnce({});

    const validContent = Buffer.from('{"asset":{"version":"2.0"}}');

    const response = await request(app)
      .post("/api/glb/upload")
      .set("x-player-id", "test-player-123")
      .attach("model", validContent, { filename: "valid.gltf" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const files = fs.readdirSync(TEST_UPLOAD_DIR);
    expect(files.length).toBe(1); // Ensure exactly 1 file was kept
  });
});
