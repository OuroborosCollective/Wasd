import fs from 'node:fs';
const path = 'server/src/core/WorldTick.ts';
let src = fs.readFileSync(path, 'utf8');
if (!src.includes('../are/ARETopologyNetwork.js')) {
  src = src.replace('import { deterministicUsageTracker, type DeterministicUsageStats } from "../are/DeterministicUsageTracker.js";\n', 'import { deterministicUsageTracker, type DeterministicUsageStats } from "../are/DeterministicUsageTracker.js";\nimport { areTopologyNetwork } from "../are/ARETopologyNetwork.js";\n');
}
if (!src.includes('function kappaCellOf')) {
  src = src.replace('function safeInt(value: unknown, fallback = 0): number {\n  const n = Number(value);\n  if (!Number.isFinite(n)) return fallback;\n  return Math.trunc(n);\n}\n', 'function safeInt(value: unknown, fallback = 0): number {\n  const n = Number(value);\n  if (!Number.isFinite(n)) return fallback;\n  return Math.trunc(n);\n}\n\nfunction kappaCellOf(entity: any): string {\n  const x = Math.round(Number(entity?.position?.x ?? 0) * 1000);\n  const y = Math.round(Number(entity?.position?.y ?? 0) * 1000);\n  const z = Math.round(Number(entity?.position?.z ?? 0) * 1000);\n  return `${x}:${y}:${z}`;\n}\n');
}
fs.writeFileSync(path, src);
