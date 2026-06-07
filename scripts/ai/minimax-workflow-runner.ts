#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";
import { MiniMaxClient } from "../../server/src/ai/MiniMaxClient.ts";

type Task = "system_health" | "npc_health" | "ui_optimization" | "arelogic";

function write(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function isEnabled(): boolean {
  return process.env.MINIMAX_ENABLED === "true";
}

function hasApiKey(): boolean {
  return Boolean(process.env.MINIMAX_API_KEY?.trim());
}

function skipped(task: Task, reason: string): Record<string, unknown> {
  return {
    ok: true,
    skipped: true,
    task,
    reason,
  };
}

function degraded(task: Task, reason: string, details: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ok: true,
    degraded: true,
    task,
    reason,
    ...details,
  };
}

function createClient(): MiniMaxClient {
  return new MiniMaxClient({
    apiKey: process.env.MINIMAX_API_KEY,
    enabled: isEnabled() && hasApiKey(),
  });
}

function scanMathRandomViolations(): Array<{ type: string; file: string; count: number }> {
  const root = path.resolve(process.cwd(), "server/src");
  const violations: Array<{ type: string; file: string; count: number }> = [];

  function scanDirectory(dir: string): void {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir).sort()) {
      if (name === "node_modules" || name === ".git" || name === "dist") continue;
      const fullPath = path.join(dir, name);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
        continue;
      }
      if (!name.endsWith(".ts") && !name.endsWith(".js")) continue;
      const content = fs.readFileSync(fullPath, "utf8");
      const matches = content.match(/\bMath\.random\s*\(/g);
      if (matches?.length) {
        violations.push({
          type: "unseeded_random",
          file: path.relative(process.cwd(), fullPath),
          count: matches.length,
        });
      }
    }
  }

  scanDirectory(root);
  return violations.sort((a, b) => a.file.localeCompare(b.file));
}

async function runTask(task: Task): Promise<unknown> {
  if (!isEnabled()) {
    return skipped(task, "minimax_disabled");
  }

  if (!hasApiKey()) {
    return skipped(task, "minimax_api_key_missing");
  }

  const client = createClient();

  if (task === "system_health") {
    const response = await client.requestSystemAnalysis();
    return response ?? degraded(task, "minimax_system_health_returned_null");
  }

  if (task === "npc_health") {
    const response = await client.requestNPCHealthCheck("all");
    return response ?? degraded(task, "minimax_npc_health_returned_null");
  }

  if (task === "ui_optimization") {
    const response = await client.requestUIOptimization();
    return response ?? degraded(task, "minimax_ui_optimization_returned_null");
  }

  const violations = scanMathRandomViolations();
  if (violations.length === 0) {
    return {
      ok: true,
      task,
      result: "No unseeded Math.random violations detected",
      violations: [],
      commands: [],
    };
  }

  const response = await client.requestAutonomousFix(
    "arelogic",
    `${violations.length} ARELogic violations detected`,
    { violations },
  );

  return response
    ? {
        ok: Boolean(response.ok),
        task,
        violations,
        response,
      }
    : degraded(task, "minimax_arelogic_fix_returned_null", { violations });
}

async function main(): Promise<void> {
  const task = String(process.argv[2] ?? "system_health") as Task;
  const allowed: readonly Task[] = ["system_health", "npc_health", "ui_optimization", "arelogic"];
  if (!allowed.includes(task)) {
    throw new Error(`unknown_minimax_task:${task}`);
  }

  const result = await runTask(task);
  write(result);
}

main().catch((error) => {
  write({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
