import express from "express";
import { createReadStream, existsSync, statSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const LOG_DIR = process.env.ARE_SHADOW_LOG_DIR || "logs";
const DEFAULT_TAIL_LINES = 200;
const MAX_TAIL_LINES = 5000;

function safeInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min) return fallback;
  if (n > max) return max;
  return n;
}

function parseJsonLines(lines: string[]): unknown[] {
  const entries: unknown[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed));
    } catch {
      // skip malformed lines
    }
  }
  return entries;
}

function redactSecrets(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redactSecrets);
  
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const secretKeys = ["token", "secret", "password", "key", "authorization", "api_key", "apiKey"];
    if (secretKeys.some(sk => key.toLowerCase().includes(sk))) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object") {
      result[key] = redactSecrets(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function areShadowLogRouter() {
  const router = express.Router();
  const baseDir = resolve(process.cwd(), LOG_DIR);

  // GET /api/are-shadow/log - Get ARE Shadow JSONL logs (tail)
  router.get("/log", (req, res) => {
    const lines = safeInt(req.query.lines as string, DEFAULT_TAIL_LINES, 10, MAX_TAIL_LINES);
    const logPath = join(baseDir, "are-shadow.jsonl");

    if (!existsSync(logPath)) {
      res.json({ 
        ok: true, 
        error: "log_file_not_found", 
        message: `${logPath} does not exist`,
        path: logPath,
        hint: "ARE_SHADOW_LOG_PATH may not be set, or logging is disabled"
      });
      return;
    }

    try {
      const stat = statSync(logPath);
      const content = createReadStream(logPath, { encoding: "utf8" });
      let buffer = "";
      let count = 0;
      const tailLines: string[] = [];

      content.on("data", (chunk: string) => {
        buffer += chunk;
        const parts = buffer.split("\n");
        buffer = parts[parts.length - 1]; // keep last incomplete line
        for (let i = 0; i < parts.length - 1; i++) {
          tailLines.push(parts[i]);
          if (tailLines.length > lines) tailLines.shift();
          count++;
        }
      });

      content.on("end", () => {
        if (buffer.trim()) tailLines.push(buffer);
        
        const entries = parseJsonLines(tailLines);
        
        // Calculate statistics
        const ticks = entries.map((e: any) => e.tick).filter((t: any) => typeof t === "number").sort((a, b) => a - b);
        const capacities = entries.map((e: any) => e.capacity).filter((c: any) => typeof c === "number");
        
        res.json({
          ok: true,
          source: "are-shadow.jsonl",
          path: logPath,
          totalLines: count,
          returnedLines: entries.length,
          sampledLines: lines,
          fileSize: stat.size,
          modifiedAt: stat.mtime.toISOString(),
          statistics: {
            tickRange: ticks.length > 0 ? { min: ticks[0], max: ticks[ticks.length - 1] } : null,
            tickCount: ticks.length,
            capacityRange: capacities.length > 0 
              ? { min: Math.min(...capacities), max: Math.max(...capacities) }
              : null,
          },
          entries: redactSecrets(entries)
        });
      });

      content.on("error", (err: Error) => {
        res.status(500).json({ ok: false, error: "read_failed", message: err.message });
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: "access_failed", message: String(err) });
    }
  });

  // GET /api/are-shadow/stats - Get ARE Shadow statistics from log
  router.get("/stats", async (req, res) => {
    const lines = safeInt(req.query.lines as string, DEFAULT_TAIL_LINES, 10, MAX_TAIL_LINES);
    const logPath = join(baseDir, "are-shadow.jsonl");

    if (!existsSync(logPath)) {
      res.json({ 
        ok: true, 
        available: false,
        message: "Log file not found. ARE Shadow logging may be disabled."
      });
      return;
    }

    try {
      const content = await readFile(logPath, "utf8");
      const allLines = content.split("\n").filter(l => l.trim());
      const tailLines = allLines.slice(-lines);
      const entries = parseJsonLines(tailLines);

      // Aggregate statistics
      const ticks = entries.map((e: any) => e.tick).filter((t: any) => typeof t === "number");
      const capacities = entries.map((e: any) => e.capacity).filter((c: any) => typeof c === "number");
      const sizes = entries.map((e: any) => e.size).filter((s: any) => typeof s === "number");

      // Count events by type
      let capsuleEvents = 0;
      let apexEvents = 0;
      let fusionEvents = 0;
      
      for (const entry of entries) {
        const e = entry as any;
        if (e.ecosystem) {
          if (e.ecosystem.capsules?.length) capsuleEvents += e.ecosystem.capsules.length;
          if (e.ecosystem.apexNpcs?.length) apexEvents += e.ecosystem.apexNpcs.length;
          if (e.ecosystem.fusions?.length) fusionEvents += e.ecosystem.fusions.length;
        }
      }

      res.json({
        ok: true,
        logFile: logPath,
        totalLogLines: allLines.length,
        analyzedLines: entries.length,
        tickRange: ticks.length > 0 
          ? { min: Math.min(...ticks), max: Math.max(...ticks), span: Math.max(...ticks) - Math.min(...ticks) }
          : null,
        capacityStats: capacities.length > 0
          ? { min: Math.min(...capacities), max: Math.max(...capacities), avg: capacities.reduce((a, b) => a + b, 0) / capacities.length }
          : null,
        bufferSizeStats: sizes.length > 0
          ? { min: Math.min(...sizes), max: Math.max(...sizes), avg: sizes.reduce((a, b) => a + b, 0) / sizes.length }
          : null,
        ecosystemEvents: {
          capsules: capsuleEvents,
          apexNpcs: apexEvents,
          fusions: fusionEvents,
        },
        latestEntry: entries.length > 0 ? redactSecrets(entries[entries.length - 1]) : null,
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: "analysis_failed", message: String(err) });
    }
  });

  // GET /api/are-shadow/directory - List all ARE-related log files
  router.get("/directory", async (req, res) => {
    try {
      const files: { name: string; size: number; modified: string }[] = [];
      
      if (existsSync(baseDir)) {
        const entries = await readdir(baseDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile()) {
            const filePath = join(baseDir, entry.name);
            try {
              const stat = statSync(filePath);
              files.push({
                name: entry.name,
                size: stat.size,
                modified: stat.mtime.toISOString(),
              });
            } catch {
              // skip inaccessible files
            }
          }
        }
      }

      res.json({
        ok: true,
        directory: baseDir,
        files: files.filter(f => 
          f.name.endsWith(".jsonl") || 
          f.name.endsWith(".log") || 
          f.name.includes("shadow") ||
          f.name.includes("are")
        ).sort((a, b) => b.modified.localeCompare(a.modified)),
        allFiles: files.sort((a, b) => b.modified.localeCompare(a.modified)),
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: "directory_failed", message: String(err) });
    }
  });

  // GET /api/are-shadow/telemetry - Get ecosystem telemetry (requires process access)
  router.get("/telemetry", async (_req, res) => {
    try {
      // Dynamically import to get runtime telemetry
      const { AREShadowAdapter } = await import("../core/are/AREShadowAdapter.js");
      
      if (typeof AREShadowAdapter.getEcosystemTelemetry !== "function") {
        res.json({
          ok: true,
          available: false,
          message: "getEcosystemTelemetry not available. ARE shadow adapter may be in minimal mode."
        });
        return;
      }

      const telemetry = AREShadowAdapter.getEcosystemTelemetry();
      
      res.json({
        ok: true,
        timestamp: new Date().toISOString(),
        telemetry: redactSecrets(telemetry),
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: "telemetry_unavailable",
        message: String(err),
        hint: "Make sure ARE Shadow adapter is properly initialized"
      });
    }
  });

  // GET /api/are-shadow/stream - Stream log entries (SSE-like)
  router.get("/stream", (req, res) => {
    const lines = safeInt(req.query.lines as string, 50, 10, 500);
    const logPath = join(baseDir, "are-shadow.jsonl");

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Transfer-Encoding", "chunked");
    res.flushHeaders();

    if (!existsSync(logPath)) {
      res.end(JSON.stringify({ error: "log_not_found", path: logPath }) + "\n");
      return;
    }

    try {
      const content = createReadStream(logPath, { encoding: "utf8" });
      let buffer = "";
      const tailLines: string[] = [];

      content.on("data", (chunk: string) => {
        buffer += chunk;
        const parts = buffer.split("\n");
        buffer = parts[parts.length - 1];
        for (let i = 0; i < parts.length - 1; i++) {
          tailLines.push(parts[i]);
          if (tailLines.length > lines) tailLines.shift();
        }
      });

      content.on("end", () => {
        if (buffer.trim()) tailLines.push(buffer);
        
        const entries = parseJsonLines(tailLines);
        res.end(JSON.stringify({
          source: "are-shadow.jsonl",
          count: entries.length,
          entries: redactSecrets(entries)
        }) + "\n");
      });

      content.on("error", (err: Error) => {
        res.end(JSON.stringify({ error: err.message }) + "\n");
      });
    } catch (err) {
      res.end(JSON.stringify({ error: String(err) }) + "\n");
    }
  });

  return router;
}