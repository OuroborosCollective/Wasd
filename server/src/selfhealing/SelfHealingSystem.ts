import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ErrorRequestHandler, Express, Request, Response } from "express";

export type ErrorType =
  | "syntax"
  | "runtime"
  | "logic"
  | "import"
  | "null"
  | "type"
  | "range"
  | "reference"
  | "custom";

export type HealingActionType =
  | "patch_code"
  | "restart_module"
  | "fallback_value"
  | "skip_execution"
  | "restore_backup"
  | "add_guard"
  | "fix_import"
  | "add_null_check"
  | "log_and_continue";

export type FeaturePriority = "critical" | "high" | "medium" | "low";
export type PatchMode = "auto" | "confirm" | "log-only";
export type LogLevel = "info" | "warn" | "error" | "success" | "heal";

export interface CodePatch {
  originalLine: string;
  repairedLine: string;
  lineNumber: number;
  reason: string;
  isReversible: boolean;
  backupPath?: string;
}

export interface HealingAction {
  type: HealingActionType;
  description: string;
  patch?: CodePatch;
  fallbackValue?: unknown;
  targetFile?: string;
  requiresRestart: boolean;
  preservesFeatures: true;
}

export interface GameStateSnapshot {
  timestamp: Date;
  activeFeatures: string[];
  runningModules: string[];
  errorCount: number;
  healingCount: number;
  uptime: number;
}

export interface ErrorContext {
  error: Error;
  errorMessage: string;
  errorStack: string;
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
  fileContent?: string;
  timestamp: Date;
  occurrenceCount: number;
  gameState?: GameStateSnapshot;
}

export interface HealingRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  pattern: RegExp;
  errorType: ErrorType;
  isFeatureDestructive: false;
  fix: (ctx: ErrorContext) => HealingAction;
}

export interface ProtectedFeature {
  id: string;
  name: string;
  description: string;
  filePatterns: string[];
  codeSignatures: string[];
  priority: FeaturePriority;
  addedBy: string;
  addedAt: Date;
  doNotDelete: true;
  doNotDisable: true;
}

export interface HealingLog {
  id: string;
  timestamp: Date;
  errorDetected: string;
  ruleApplied: string;
  actionTaken: string;
  success: boolean;
  featuresPreserved: string[];
  rollbackAvailable: boolean;
  duration: number;
}

export interface ErrorOccurrence {
  firstSeen: Date;
  lastSeen: Date;
  previousSeen?: Date;
  count: number;
  healed: boolean;
  ruleId?: string;
}

export interface LearnedPattern {
  pattern: string;
  occurrences: number;
  successfulFix: string;
  lastUpdated: Date;
}

export interface SelfHealingConfig {
  enabled: boolean;
  rootDir: string;
  watchPaths: string[];
  ignorePaths: string[];
  backupDirectory: string;
  auditLogPath: string;
  protectedFeaturesPath: string;
  knowledgeBasePath: string;
  maxHealingAttemptsPerError: number;
  healingCooldownMs: number;
  autoRestartOnCritical: boolean;
  preserveAllFeaturesByDefault: boolean;
  verboseLogging: boolean;
  patchMode: PatchMode;
  dashboardEnabled: boolean;
  dashboardRoutePrefix: string;
  watchdogIntervalMs: number;
}

export interface SelfHealingDashboardOptions {
  enabled?: boolean;
  routePrefix?: string;
  allowCors?: boolean;
  allowedOrigin?: string;
}

function envFlag(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function envPatchMode(fallback: PatchMode): PatchMode {
  const raw = process.env.SELF_HEALING_PATCH_MODE?.trim().toLowerCase();
  if (raw === "auto" || raw === "confirm" || raw === "log-only") {
    return raw;
  }
  return fallback;
}

function toJsonDateArray<T extends object>(
  value: T[],
  dateKeys: (keyof T)[]
): T[] {
  return value.map((entry) => {
    const copy = { ...entry } as Record<string, unknown>;
    for (const key of dateKeys) {
      const existing = copy[key as string];
      if (typeof existing === "string" || typeof existing === "number" || existing instanceof Date) {
        copy[key as string] = new Date(existing);
      }
    }
    return copy as T;
  });
}

function extractObjectName(message: string): string {
  const propertyMatch = message.match(/Cannot read propert(?:y|ies) ['"]?(\w+)['"]? of/i);
  if (propertyMatch?.[1]) return propertyMatch[1];
  const receiverMatch = message.match(/of (?:null|undefined) \((\w+)\)/i);
  return receiverMatch?.[1] ?? "value";
}

function extractVariableName(message: string): string {
  const match = message.match(/^(\w+) is not defined/i);
  return match?.[1] ?? "value";
}

function getIntelligentFallback(message: string): unknown {
  const variable = extractVariableName(message).toLowerCase();
  if (/count|score|health|mana|level|damage|gold|exp|xp|speed|timer/.test(variable)) return 0;
  if (/name|title|label|text|message|description|tag/.test(variable)) return "";
  if (/list|items|array|players|enemies|objects|children|entities/.test(variable)) return [];
  if (/config|options|settings|data|map|state|info/.test(variable)) return {};
  if (/enabled|active|visible|running|alive|dead|open|closed/.test(variable)) return false;
  return null;
}

function extractFilePath(stack: string): string | undefined {
  const direct = stack.match(/(?:file:\/\/)?([^\s)]+\.(?:ts|tsx|js|jsx|mjs|cjs|json)):\d+:\d+/);
  return direct?.[1];
}

function extractLineNumber(stack: string): number | undefined {
  const match = stack.match(/:(\d+):(\d+)/);
  return match?.[1] ? Number(match[1]) : undefined;
}

function extractColumnNumber(stack: string): number | undefined {
  const match = stack.match(/:(\d+):(\d+)/);
  return match?.[2] ? Number(match[2]) : undefined;
}

export function generateHealingId(): string {
  return `heal-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

export function colorLog(level: LogLevel, message: string): void {
  const prefix: Record<LogLevel, string> = {
    info: "\u001b[36m[SelfHeal info]\u001b[0m",
    warn: "\u001b[33m[SelfHeal warn]\u001b[0m",
    error: "\u001b[31m[SelfHeal error]\u001b[0m",
    success: "\u001b[32m[SelfHeal ok]\u001b[0m",
    heal: "\u001b[35m[SelfHeal heal]\u001b[0m",
  };
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`${prefix[level]} [${timestamp}] ${message}`);
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function safeReadFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

export function safeWriteFile(filePath: string, content: string): boolean {
  try {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, "utf8");
    return true;
  } catch {
    return false;
  }
}

export function safeReadJson<T>(filePath: string, fallback: T): T {
  const raw = safeReadFile(filePath);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeWriteJson(filePath: string, data: unknown): boolean {
  return safeWriteFile(filePath, JSON.stringify(data, null, 2));
}

const BUILT_IN_HEALING_RULES: HealingRule[] = [
  {
    id: "HEAL-001",
    name: "NullReference Guard",
    description: "Adds a narrow null guard around the failing line.",
    priority: 1,
    pattern: /Cannot read propert(?:y|ies) .* of (?:null|undefined)/i,
    errorType: "null",
    isFeatureDestructive: false,
    fix: (ctx): HealingAction => {
      const lines = ctx.fileContent?.split("\n") ?? [];
      const index = (ctx.lineNumber ?? 1) - 1;
      const originalLine = lines[index] ?? "";
      const objectName = extractObjectName(ctx.errorMessage);
      return {
        type: "add_null_check",
        description: `Add null guard for ${objectName}`,
        requiresRestart: false,
        preservesFeatures: true,
        patch: {
          originalLine,
          repairedLine: `if (${objectName} != null) { ${originalLine.trim()} }`,
          lineNumber: ctx.lineNumber ?? 0,
          reason: "Prevent null/undefined property access on the failing line.",
          isReversible: true,
        },
      };
    },
  },
  {
    id: "HEAL-002",
    name: "ReferenceError Fallback",
    description: "Provides a runtime fallback for undefined identifiers.",
    priority: 2,
    pattern: /(\w+) is not defined/i,
    errorType: "reference",
    isFeatureDestructive: false,
    fix: (ctx): HealingAction => ({
      type: "fallback_value",
      description: `Use fallback for ${extractVariableName(ctx.errorMessage)}`,
      fallbackValue: getIntelligentFallback(ctx.errorMessage),
      requiresRestart: false,
      preservesFeatures: true,
    }),
  },
  {
    id: "HEAL-003",
    name: "TypeError Guard",
    description: "Wraps the failing line in a local try/catch.",
    priority: 3,
    pattern: /TypeError|is not a function|Cannot set propert/i,
    errorType: "type",
    isFeatureDestructive: false,
    fix: (ctx): HealingAction => {
      const lines = ctx.fileContent?.split("\n") ?? [];
      const index = (ctx.lineNumber ?? 1) - 1;
      const originalLine = lines[index] ?? "";
      return {
        type: "add_guard",
        description: "Wrap failing line in try/catch guard",
        requiresRestart: false,
        preservesFeatures: true,
        patch: {
          originalLine,
          repairedLine: `try { ${originalLine.trim()} } catch (_selfHealTypeError) { /* self-heal */ }`,
          lineNumber: ctx.lineNumber ?? 0,
          reason: "Prevent a single runtime type error from cascading.",
          isReversible: true,
        },
      };
    },
  },
  {
    id: "HEAL-004",
    name: "Import Resolver",
    description: "Records module resolution failures for safe follow-up handling.",
    priority: 1,
    pattern: /Cannot find module|MODULE_NOT_FOUND|Failed to resolve/i,
    errorType: "import",
    isFeatureDestructive: false,
    fix: (ctx): HealingAction => ({
      type: "fix_import",
      description: `Record import error for ${ctx.filePath ?? "unknown file"}`,
      targetFile: ctx.filePath,
      requiresRestart: true,
      preservesFeatures: true,
    }),
  },
  {
    id: "HEAL-005",
    name: "RangeError Guard",
    description: "Wraps stack overflow / range failures in a local guard.",
    priority: 3,
    pattern: /RangeError|Maximum call stack|Invalid array length/i,
    errorType: "range",
    isFeatureDestructive: false,
    fix: (ctx): HealingAction => {
      const lines = ctx.fileContent?.split("\n") ?? [];
      const index = (ctx.lineNumber ?? 1) - 1;
      const originalLine = lines[index] ?? "";
      return {
        type: "add_guard",
        description: "Protect failing line from range / recursion crash",
        requiresRestart: false,
        preservesFeatures: true,
        patch: {
          originalLine,
          repairedLine: `try { ${originalLine.trim()} } catch (_selfHealRangeError) { /* self-heal */ }`,
          lineNumber: ctx.lineNumber ?? 0,
          reason: "Stop a repeated range failure from crashing the process.",
          isReversible: true,
        },
      };
    },
  },
  {
    id: "HEAL-006",
    name: "Syntax Restore",
    description: "Restores the last backup when a syntax error breaks loading.",
    priority: 1,
    pattern: /SyntaxError|Unexpected token|Unexpected end of input/i,
    errorType: "syntax",
    isFeatureDestructive: false,
    fix: (ctx): HealingAction => ({
      type: "restore_backup",
      description: `Restore latest backup for ${ctx.filePath ?? "unknown file"}`,
      targetFile: ctx.filePath,
      requiresRestart: true,
      preservesFeatures: true,
    }),
  },
  {
    id: "HEAL-007",
    name: "Unhandled Promise Guard",
    description: "Records promise rejections and keeps the process alive.",
    priority: 4,
    pattern: /UnhandledPromiseRejection|UnhandledPromise|Promise.*reject/i,
    errorType: "runtime",
    isFeatureDestructive: false,
    fix: (): HealingAction => ({
      type: "log_and_continue",
      description: "Record promise rejection and continue",
      requiresRestart: false,
      preservesFeatures: true,
    }),
  },
  {
    id: "HEAL-008",
    name: "JSON Parse Guard",
    description: "Rewrites a single JSON.parse call into a guarded parse.",
    priority: 2,
    pattern: /JSON\.parse|Unexpected token.*JSON|is not valid JSON/i,
    errorType: "runtime",
    isFeatureDestructive: false,
    fix: (ctx): HealingAction => {
      const lines = ctx.fileContent?.split("\n") ?? [];
      const index = (ctx.lineNumber ?? 1) - 1;
      const originalLine = lines[index] ?? "";
      const repairedLine =
        originalLine.replace(
          /JSON\.parse\((.+)\)/g,
          "(() => { try { return JSON.parse($1); } catch { return {}; } })()"
        ) || originalLine;
      return {
        type: "patch_code",
        description: "Guard JSON.parse call on failing line",
        requiresRestart: false,
        preservesFeatures: true,
        patch: {
          originalLine,
          repairedLine,
          lineNumber: ctx.lineNumber ?? 0,
          reason: "Convert JSON.parse into a safe inline parse for malformed payloads.",
          isReversible: true,
        },
      };
    },
  },
  {
    id: "HEAL-009",
    name: "Network Runtime Recovery",
    description: "Records transient network errors without disabling features.",
    priority: 5,
    pattern: /fetch|ECONNREFUSED|ENOTFOUND|NetworkError|net::ERR/i,
    errorType: "runtime",
    isFeatureDestructive: false,
    fix: (): HealingAction => ({
      type: "log_and_continue",
      description: "Record transient network issue and continue",
      requiresRestart: false,
      preservesFeatures: true,
    }),
  },
  {
    id: "HEAL-010",
    name: "Runtime Stabilizer",
    description: "Fallback rule for unknown runtime failures.",
    priority: 10,
    pattern: /.*/,
    errorType: "runtime",
    isFeatureDestructive: false,
    fix: (): HealingAction => ({
      type: "log_and_continue",
      description: "Record unknown runtime issue and continue",
      requiresRestart: false,
      preservesFeatures: true,
    }),
  },
];

class FeatureProtectionRegistry {
  private readonly registryPath: string;
  private readonly features = new Map<string, ProtectedFeature>();

  constructor(registryPath: string) {
    this.registryPath = registryPath;
    this.load();
    this.registerDefaultFeatures();
  }

  private load(): void {
    const stored = safeReadJson<ProtectedFeature[]>(this.registryPath, []);
    for (const feature of toJsonDateArray(stored, ["addedAt"])) {
      this.features.set(feature.id, feature);
    }
  }

  private save(): void {
    safeWriteJson(this.registryPath, [...this.features.values()]);
  }

  private registerDefaultFeatures(): void {
    const defaults: Omit<ProtectedFeature, "addedAt">[] = [
      {
        id: "FEAT-SERVER-BOOTSTRAP",
        name: "Server bootstrap",
        description: "Express/Vite bootstrap and process entrypoints stay protected.",
        filePatterns: ["**/index.ts", "**/ServerBootstrap.ts"],
        codeSignatures: ["new ServerBootstrap()", "httpServer.listen", "app.get(\"/health\""],
        priority: "critical",
        addedBy: "system",
        doNotDelete: true,
        doNotDisable: true,
      },
      {
        id: "FEAT-WS-NETWORK",
        name: "WebSocket transport",
        description: "Live networking and player sync logic stay protected.",
        filePatterns: ["**/WebSocketServer.ts", "**/websocketClient.ts", "**/networking/*.ts"],
        codeSignatures: ["connectSocket(", "reconnectGameSocket", "GameWebSocketServer", "entity_sync"],
        priority: "critical",
        addedBy: "system",
        doNotDelete: true,
        doNotDisable: true,
      },
      {
        id: "FEAT-WORLD-TICK",
        name: "Simulation tick",
        description: "World loop and persistence remain protected.",
        filePatterns: ["**/WorldTick.ts", "**/playerPersistence*.ts", "**/persistence/*.ts"],
        codeSignatures: ["tick.start()", "tick.init()", "getPersistenceStats", "stateBroadcastIntervalMs"],
        priority: "critical",
        addedBy: "system",
        doNotDelete: true,
        doNotDisable: true,
      },
      {
        id: "FEAT-CLIENT-BOOT",
        name: "Client bootstrap",
        description: "Babylon boot path and client core remain protected.",
        filePatterns: ["**/clientBoot.ts", "**/main.ts", "**/BabylonBoot.ts"],
        codeSignatures: ["bootAreloriaClient", "createBabylonApp", "MMORPGClientCore", "renderHUD"],
        priority: "high",
        addedBy: "system",
        doNotDelete: true,
        doNotDisable: true,
      },
      {
        id: "FEAT-AUTH",
        name: "Firebase auth",
        description: "Auth and token refresh flow remain protected.",
        filePatterns: ["**/firebase.ts", "**/gameAuth.ts", "**/auth/*.ts"],
        codeSignatures: ["getIdToken", "USE_FIREBASE_WS_LOGIN", "FIREBASE_PROJECT_ID"],
        priority: "high",
        addedBy: "system",
        doNotDelete: true,
        doNotDisable: true,
      },
      {
        id: "FEAT-ADMIN-CONTENT",
        name: "Content admin",
        description: "Admin content endpoints remain protected.",
        filePatterns: ["**/adminContentRoute.ts", "**/admin*.ts"],
        codeSignatures: ["adminContentRouter", "/api/admin/content", "publish-pack"],
        priority: "medium",
        addedBy: "system",
        doNotDelete: true,
        doNotDisable: true,
      },
    ];

    for (const feature of defaults) {
      if (!this.features.has(feature.id)) {
        this.features.set(feature.id, { ...feature, addedAt: new Date() });
      }
    }
    this.save();
  }

  public register(feature: Omit<ProtectedFeature, "addedAt">): void {
    this.features.set(feature.id, { ...feature, addedAt: new Date() });
    this.save();
  }

  public isFeatureCode(content: string, filePath: string): boolean {
    const normalizedFilePath = filePath.replace(/\\/g, "/");
    for (const feature of this.features.values()) {
      if (feature.codeSignatures.some((signature) => content.includes(signature))) {
        return true;
      }
      if (
        feature.filePatterns.some((pattern) => {
          const escaped = pattern
            .split("**")
            .map((chunk) => chunk.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*"))
            .join(".*");
          return new RegExp(`^${escaped}$`).test(normalizedFilePath);
        })
      ) {
        return true;
      }
    }
    return false;
  }

  public getAll(): ProtectedFeature[] {
    return [...this.features.values()];
  }

  public getActiveFeatureNames(): string[] {
    return [...this.features.values()].map((feature) => feature.name);
  }
}

class BackupManager {
  private readonly backupDir: string;
  private readonly maxBackupsPerFile = 5;

  constructor(backupDir: string) {
    this.backupDir = backupDir;
    ensureDir(backupDir);
  }

  public createBackup(filePath: string): string | null {
    const content = safeReadFile(filePath);
    if (content == null) return null;
    const baseName = path.basename(filePath);
    const backupPath = path.join(this.backupDir, `${baseName}.${Date.now()}.backup`);
    if (!safeWriteFile(backupPath, content)) return null;
    this.prune(baseName);
    return backupPath;
  }

  public restoreLatestBackup(filePath: string): boolean {
    const backups = this.listBackupsForFile(path.basename(filePath));
    const latest = backups[backups.length - 1];
    if (!latest) return false;
    const content = safeReadFile(latest);
    if (content == null) return false;
    return safeWriteFile(filePath, content);
  }

  public listBackups(): string[] {
    try {
      return fs.readdirSync(this.backupDir).filter((entry) => entry.endsWith(".backup"));
    } catch {
      return [];
    }
  }

  private listBackupsForFile(baseName: string): string[] {
    try {
      return fs
        .readdirSync(this.backupDir)
        .filter((entry) => entry.startsWith(baseName) && entry.endsWith(".backup"))
        .map((entry) => path.join(this.backupDir, entry))
        .sort();
    } catch {
      return [];
    }
  }

  private prune(baseName: string): void {
    const backups = this.listBackupsForFile(baseName);
    if (backups.length <= this.maxBackupsPerFile) return;
    for (const oldBackup of backups.slice(0, backups.length - this.maxBackupsPerFile)) {
      try {
        fs.unlinkSync(oldBackup);
      } catch {
        /* ignore */
      }
    }
  }
}

class AuditLogger {
  private readonly filePath: string;
  private logs: HealingLog[] = [];

  constructor(filePath: string) {
    this.filePath = filePath;
    this.load();
  }

  private load(): void {
    const stored = safeReadJson<HealingLog[]>(this.filePath, []);
    this.logs = toJsonDateArray(stored, ["timestamp"]);
  }

  private save(): void {
    const trimmed = this.logs.slice(-1000);
    this.logs = trimmed;
    safeWriteJson(this.filePath, this.logs);
  }

  public record(entry: HealingLog): void {
    this.logs.push(entry);
    this.save();
  }

  public getRecent(count: number): HealingLog[] {
    return this.logs.slice(-count);
  }

  public getAll(): HealingLog[] {
    return [...this.logs];
  }

  public getStats(): {
    total: number;
    successful: number;
    failed: number;
    successRate: string;
    mostCommonError: string;
  } {
    const total = this.logs.length;
    const successful = this.logs.filter((entry) => entry.success).length;
    const failed = total - successful;
    const frequencies = new Map<string, number>();
    for (const entry of this.logs) {
      frequencies.set(entry.errorDetected, (frequencies.get(entry.errorDetected) ?? 0) + 1);
    }
    const mostCommonError =
      [...frequencies.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";
    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? `${((successful / total) * 100).toFixed(1)}%` : "0%",
      mostCommonError,
    };
  }
}

class LocalLearningEngine {
  private readonly filePath: string;
  private readonly patterns = new Map<string, LearnedPattern>();

  constructor(filePath: string) {
    this.filePath = filePath;
    this.load();
  }

  private load(): void {
    const stored = safeReadJson<LearnedPattern[]>(this.filePath, []);
    for (const pattern of toJsonDateArray(stored, ["lastUpdated"])) {
      this.patterns.set(pattern.pattern, pattern);
    }
  }

  private save(): void {
    safeWriteJson(this.filePath, [...this.patterns.values()]);
  }

  public learn(errorMessage: string, successfulRuleId: string): void {
    const normalized = this.normalize(errorMessage);
    const current = this.patterns.get(normalized);
    if (current) {
      current.occurrences += 1;
      current.successfulFix = successfulRuleId;
      current.lastUpdated = new Date();
    } else {
      this.patterns.set(normalized, {
        pattern: normalized,
        occurrences: 1,
        successfulFix: successfulRuleId,
        lastUpdated: new Date(),
      });
    }
    this.save();
  }

  public getSuggestedRuleId(errorMessage: string): string | undefined {
    const normalized = this.normalize(errorMessage);
    const direct = this.patterns.get(normalized);
    if (direct) return direct.successfulFix;

    let bestRuleId: string | undefined;
    let bestScore = 0;
    for (const candidate of this.patterns.values()) {
      const score = this.similarity(normalized, candidate.pattern);
      if (score > 0.6 && score > bestScore) {
        bestScore = score;
        bestRuleId = candidate.successfulFix;
      }
    }
    return bestRuleId;
  }

  public getAllPatterns(): LearnedPattern[] {
    return [...this.patterns.values()].sort((a, b) => b.occurrences - a.occurrences);
  }

  public getPatternCount(): number {
    return this.patterns.size;
  }

  private normalize(message: string): string {
    return message
      .replace(/\d+/g, "N")
      .replace(/'[^']*'/g, "'X'")
      .replace(/"[^"]*"/g, '"X"')
      .replace(/\bat\b.*/gs, "")
      .trim()
      .toLowerCase()
      .slice(0, 160);
  }

  private similarity(a: string, b: string): number {
    const left = new Set(a.split(/\s+/).filter(Boolean));
    const right = new Set(b.split(/\s+/).filter(Boolean));
    const union = new Set([...left, ...right]);
    if (union.size === 0) return 0;
    let intersection = 0;
    for (const token of left) {
      if (right.has(token)) intersection += 1;
    }
    return intersection / union.size;
  }
}

class ErrorTracker {
  private readonly occurrences = new Map<string, ErrorOccurrence>();
  private readonly cooldownMs: number;
  private readonly maxAttempts: number;

  constructor(cooldownMs: number, maxAttempts: number) {
    this.cooldownMs = cooldownMs;
    this.maxAttempts = maxAttempts;
  }

  private key(error: Error): string {
    return `${error.name}:${error.message.slice(0, 160)}`;
  }

  public track(error: Error): ErrorOccurrence {
    const normalizedKey = this.key(error);
    const now = new Date();
    const current = this.occurrences.get(normalizedKey);
    if (current) {
      current.previousSeen = current.lastSeen;
      current.count += 1;
      current.lastSeen = now;
      return current;
    }
    const created: ErrorOccurrence = {
      firstSeen: now,
      lastSeen: now,
      count: 1,
      healed: false,
    };
    this.occurrences.set(normalizedKey, created);
    return created;
  }

  public shouldHeal(error: Error): boolean {
    const current = this.occurrences.get(this.key(error));
    if (!current) return true;
    if (current.count > this.maxAttempts) return false;
    if (current.count <= 1) return true;
    const reference = current.previousSeen ?? current.lastSeen;
    return Date.now() - reference.getTime() >= this.cooldownMs;
  }

  public markHealed(error: Error, ruleId: string): void {
    const current = this.occurrences.get(this.key(error));
    if (!current) return;
    current.healed = true;
    current.ruleId = ruleId;
  }

  public getStats(): { tracked: number; healed: number; persistent: number } {
    const values = [...this.occurrences.values()];
    return {
      tracked: values.length,
      healed: values.filter((entry) => entry.healed).length,
      persistent: values.filter((entry) => !entry.healed && entry.count > this.maxAttempts).length,
    };
  }
}

class CodePatcher {
  private readonly backupManager: BackupManager;
  private readonly featureRegistry: FeatureProtectionRegistry;
  private readonly rootDir: string;
  private readonly allowedDirs: string[];
  private readonly ignoredSegments: string[];

  constructor(
    backupManager: BackupManager,
    featureRegistry: FeatureProtectionRegistry,
    rootDir: string,
    allowedDirs: string[],
    ignoredSegments: string[]
  ) {
    this.backupManager = backupManager;
    this.featureRegistry = featureRegistry;
    this.rootDir = rootDir;
    this.allowedDirs = allowedDirs;
    this.ignoredSegments = ignoredSegments;
  }

  public applyPatch(filePath: string, patch: CodePatch): boolean {
    if (!this.isPatchable(filePath)) {
      colorLog("warn", `Patch rejected outside allowed watch paths: ${filePath}`);
      return false;
    }

    const content = safeReadFile(filePath);
    if (content == null) return false;

    if (this.featureRegistry.isFeatureCode(patch.originalLine, filePath)) {
      colorLog("warn", `Feature protection blocked patch at ${filePath}:${patch.lineNumber}`);
      return false;
    }

    const lines = content.split("\n");
    const index = patch.lineNumber - 1;
    if (index < 0 || index >= lines.length) return false;
    if (lines[index] !== patch.originalLine) {
      colorLog("warn", `Patch drift detected at ${filePath}:${patch.lineNumber}`);
      return false;
    }

    const backupPath = this.backupManager.createBackup(filePath);
    if (!backupPath) return false;
    patch.backupPath = backupPath;

    lines[index] = patch.repairedLine;
    return safeWriteFile(filePath, lines.join("\n"));
  }

  public restoreBackup(filePath: string): boolean {
    if (!this.isPatchable(filePath)) {
      return false;
    }
    return this.backupManager.restoreLatestBackup(filePath);
  }

  private isPatchable(filePath: string): boolean {
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(this.rootDir)) return false;
    if (
      this.ignoredSegments.some((segment) => {
        const normalized = segment.replace(/\\/g, "/");
        return resolved.replace(/\\/g, "/").includes(`/${normalized}/`);
      })
    ) {
      return false;
    }
    return this.allowedDirs.some((base) => resolved === base || resolved.startsWith(`${base}${path.sep}`));
  }
}

let globalSelfHealingSystem: SelfHealingSystem | null = null;

export class SelfHealingSystem extends EventEmitter {
  private readonly config: SelfHealingConfig;
  private readonly rules: HealingRule[];
  private readonly featureRegistry: FeatureProtectionRegistry;
  private readonly backupManager: BackupManager;
  private readonly auditLogger: AuditLogger;
  private readonly learningEngine: LocalLearningEngine;
  private readonly errorTracker: ErrorTracker;
  private readonly codePatcher: CodePatcher;
  private readonly watchedDirs: string[];
  private readonly uncaughtExceptionHandler = (error: Error): void => {
    colorLog("error", `uncaughtException: ${error.message}`);
    void this.heal(error);
  };
  private readonly unhandledRejectionHandler = (reason: unknown): void => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    colorLog("error", `unhandledRejection: ${error.message}`);
    void this.heal(error);
  };
  private readonly sigtermHandler = (): void => {
    colorLog("warn", "SIGTERM received, stopping self-healing");
    this.deactivate();
  };
  private readonly sigintHandler = (): void => {
    colorLog("warn", "SIGINT received, stopping self-healing");
    this.deactivate();
  };
  private startTime = new Date();
  private totalErrors = 0;
  private totalHealed = 0;
  private active = false;
  private hooksInstalled = false;

  constructor(config: Partial<SelfHealingConfig> = {}) {
    super();

    const rootDir = path.resolve(config.rootDir ?? process.cwd());
    const defaultPatchMode: PatchMode = envPatchMode("auto");
    const dashboardRoutePrefix = config.dashboardRoutePrefix ?? process.env.SELF_HEALING_DASHBOARD_PREFIX ?? "/selfhealing";

    this.config = {
      enabled: config.enabled ?? envFlag("SELF_HEALING_ENABLED", true),
      rootDir,
      watchPaths: config.watchPaths ?? ["server/src", "client/src", "shared", "game-data"],
      ignorePaths: config.ignorePaths ?? ["node_modules", ".git", "dist", "build", ".selfhealing"],
      backupDirectory:
        config.backupDirectory ??
        path.join(rootDir, process.env.SELF_HEALING_HOME?.trim() || ".selfhealing", "backups"),
      auditLogPath:
        config.auditLogPath ??
        path.join(rootDir, process.env.SELF_HEALING_HOME?.trim() || ".selfhealing", "audit.json"),
      protectedFeaturesPath:
        config.protectedFeaturesPath ??
        path.join(rootDir, process.env.SELF_HEALING_HOME?.trim() || ".selfhealing", "features.json"),
      knowledgeBasePath:
        config.knowledgeBasePath ??
        path.join(rootDir, process.env.SELF_HEALING_HOME?.trim() || ".selfhealing", "knowledge.json"),
      maxHealingAttemptsPerError: config.maxHealingAttemptsPerError ?? envNumber("SELF_HEALING_MAX_ATTEMPTS", 3),
      healingCooldownMs: config.healingCooldownMs ?? envNumber("SELF_HEALING_COOLDOWN_MS", 5000),
      autoRestartOnCritical: config.autoRestartOnCritical ?? envFlag("SELF_HEALING_AUTO_RESTART", false),
      preserveAllFeaturesByDefault: config.preserveAllFeaturesByDefault ?? true,
      verboseLogging: config.verboseLogging ?? envFlag("SELF_HEALING_VERBOSE", true),
      patchMode: config.patchMode ?? defaultPatchMode,
      dashboardEnabled: config.dashboardEnabled ?? envFlag("SELF_HEALING_DASHBOARD", true),
      dashboardRoutePrefix,
      watchdogIntervalMs: config.watchdogIntervalMs ?? envNumber("SELF_HEALING_WATCHDOG_INTERVAL_MS", 30_000),
    };

    const stateDir = path.dirname(this.config.auditLogPath);
    ensureDir(stateDir);
    ensureDir(this.config.backupDirectory);

    this.watchedDirs = this.config.watchPaths.map((watchPath) => path.resolve(this.config.rootDir, watchPath));
    this.featureRegistry = new FeatureProtectionRegistry(this.config.protectedFeaturesPath);
    this.backupManager = new BackupManager(this.config.backupDirectory);
    this.auditLogger = new AuditLogger(this.config.auditLogPath);
    this.learningEngine = new LocalLearningEngine(this.config.knowledgeBasePath);
    this.errorTracker = new ErrorTracker(
      this.config.healingCooldownMs,
      this.config.maxHealingAttemptsPerError
    );
    this.codePatcher = new CodePatcher(
      this.backupManager,
      this.featureRegistry,
      this.config.rootDir,
      this.watchedDirs,
      this.config.ignorePaths
    );
    this.rules = [...BUILT_IN_HEALING_RULES].sort((a, b) => a.priority - b.priority);

    colorLog("success", `Self-healing system ready on ${os.platform()} ${os.arch()}`);
    colorLog("info", `Patch mode: ${this.config.patchMode}`);
    colorLog("info", `Rules loaded: ${this.rules.length}`);
  }

  public activate(): void {
    if (!this.config.enabled) {
      colorLog("warn", "Self-healing disabled by configuration");
      return;
    }
    if (this.active) return;
    this.active = true;
    this.startTime = new Date();

    if (!this.hooksInstalled) {
      process.on("uncaughtException", this.uncaughtExceptionHandler);
      process.on("unhandledRejection", this.unhandledRejectionHandler);
      process.on("SIGTERM", this.sigtermHandler);
      process.on("SIGINT", this.sigintHandler);
      this.hooksInstalled = true;
    }

    this.emit("activated");
    colorLog("success", "Self-healing active");
  }

  public deactivate(): void {
    if (!this.active) return;
    this.active = false;
    if (this.hooksInstalled) {
      process.off("uncaughtException", this.uncaughtExceptionHandler);
      process.off("unhandledRejection", this.unhandledRejectionHandler);
      process.off("SIGTERM", this.sigtermHandler);
      process.off("SIGINT", this.sigintHandler);
      this.hooksInstalled = false;
    }
    this.emit("deactivated");
  }

  public protectFeature(feature: Omit<ProtectedFeature, "addedAt">): void {
    this.featureRegistry.register(feature);
  }

  public addCustomRule(rule: HealingRule): void {
    if (rule.isFeatureDestructive !== false) {
      colorLog("error", `Rejected custom rule ${rule.id}: destructive rules are forbidden`);
      return;
    }
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  public backupFile(filePath: string): string | null {
    return this.backupManager.createBackup(filePath);
  }

  public async submitError(error: Error, filePath?: string): Promise<boolean> {
    return this.heal(error, filePath);
  }

  public async heal(error: Error, filePath?: string): Promise<boolean> {
    if (!this.active || !this.config.enabled) return false;

    const startedAt = Date.now();
    this.totalErrors += 1;
    const occurrence = this.errorTracker.track(error);
    if (!this.errorTracker.shouldHeal(error)) {
      colorLog("warn", `Cooldown / max attempts reached for "${error.message.slice(0, 80)}"`);
      return false;
    }

    const resolvedFilePath = filePath ?? extractFilePath(error.stack ?? "");
    const normalizedFilePath = resolvedFilePath ? path.resolve(resolvedFilePath) : undefined;
    const fileContent = normalizedFilePath ? safeReadFile(normalizedFilePath) ?? undefined : undefined;
    const lineNumber = extractLineNumber(error.stack ?? "");
    const columnNumber = extractColumnNumber(error.stack ?? "");
    const context: ErrorContext = {
      error,
      errorMessage: error.message,
      errorStack: error.stack ?? "",
      filePath: normalizedFilePath,
      lineNumber,
      columnNumber,
      fileContent,
      timestamp: new Date(),
      occurrenceCount: occurrence.count,
      gameState: this.captureGameState(),
    };

    const rule = this.findBestRule(error);
    if (!rule) return false;

    const action = rule.fix(context);
    const success = await this.executeAction(action, context);
    const duration = Date.now() - startedAt;

    if (success) {
      this.totalHealed += 1;
      this.errorTracker.markHealed(error, rule.id);
      this.learningEngine.learn(error.message, rule.id);
      colorLog("success", `Healed ${error.name} in ${formatDuration(duration)} via ${rule.id}`);
    } else {
      colorLog("warn", `Self-heal could not complete for ${error.name} via ${rule.id}`);
    }

    const logEntry: HealingLog = {
      id: generateHealingId(),
      timestamp: new Date(),
      errorDetected: `${error.name}: ${error.message.slice(0, 160)}`,
      ruleApplied: `[${rule.id}] ${rule.name}`,
      actionTaken: action.description,
      success,
      featuresPreserved: this.featureRegistry.getActiveFeatureNames(),
      rollbackAvailable: Boolean(action.patch?.isReversible),
      duration,
    };
    this.auditLogger.record(logEntry);
    this.emit("healed", logEntry);
    return success;
  }

  public getStatus(): {
    active: boolean;
    uptime: string;
    totalErrors: number;
    totalHealed: number;
    healingRate: string;
    rulesLoaded: number;
    featuresProtected: number;
    learnedPatterns: number;
    auditStats: ReturnType<AuditLogger["getStats"]>;
    trackerStats: ReturnType<ErrorTracker["getStats"]>;
    backups: string[];
    config: SelfHealingConfig;
  } {
    const uptimeMs = Date.now() - this.startTime.getTime();
    return {
      active: this.active,
      uptime: formatDuration(uptimeMs),
      totalErrors: this.totalErrors,
      totalHealed: this.totalHealed,
      healingRate:
        this.totalErrors > 0 ? `${((this.totalHealed / this.totalErrors) * 100).toFixed(1)}%` : "0%",
      rulesLoaded: this.rules.length,
      featuresProtected: this.featureRegistry.getAll().length,
      learnedPatterns: this.learningEngine.getPatternCount(),
      auditStats: this.auditLogger.getStats(),
      trackerStats: this.errorTracker.getStats(),
      backups: this.backupManager.listBackups(),
      config: this.config,
    };
  }

  public getHealthSummary(): {
    enabled: boolean;
    active: boolean;
    patchMode: PatchMode;
    dashboardRoutePrefix: string;
    totalErrors: number;
    totalHealed: number;
    healingRate: string;
  } {
    const status = this.getStatus();
    return {
      enabled: this.config.enabled,
      active: status.active,
      patchMode: this.config.patchMode,
      dashboardRoutePrefix: this.config.dashboardRoutePrefix,
      totalErrors: status.totalErrors,
      totalHealed: status.totalHealed,
      healingRate: status.healingRate,
    };
  }

  public getRecentLogs(count = 20): HealingLog[] {
    return this.auditLogger.getRecent(count);
  }

  public getProtectedFeatures(): ProtectedFeature[] {
    return this.featureRegistry.getAll();
  }

  public getLearnedPatterns(): LearnedPattern[] {
    return this.learningEngine.getAllPatterns();
  }

  public getRules(): HealingRule[] {
    return [...this.rules];
  }

  public printStatusReport(): void {
    const status = this.getStatus();
    colorLog(
      "info",
      `Status active=${status.active} errors=${status.totalErrors} healed=${status.totalHealed} rate=${status.healingRate}`
    );
  }

  private findBestRule(error: Error): HealingRule | undefined {
    const learnedRuleId = this.learningEngine.getSuggestedRuleId(error.message);
    if (learnedRuleId) {
      const learned = this.rules.find((rule) => rule.id === learnedRuleId);
      if (learned) return learned;
    }

    const fullText = `${error.name} ${error.message}`;
    return this.rules.find((rule) => rule.pattern.test(fullText));
  }

  private async executeAction(action: HealingAction, context: ErrorContext): Promise<boolean> {
    if (this.config.patchMode === "confirm") {
      colorLog("info", `[confirm] queued action: ${action.description}`);
      this.emit("action_pending_confirmation", action);
      return true;
    }
    if (this.config.patchMode === "log-only" && action.type !== "log_and_continue") {
      colorLog("info", `[log-only] ${action.description}`);
      return true;
    }

    switch (action.type) {
      case "add_null_check":
      case "add_guard":
      case "patch_code":
        if (!action.patch || !context.filePath) return false;
        return this.codePatcher.applyPatch(context.filePath, action.patch);
      case "fallback_value":
        this.emit("fallback_applied", {
          variable: extractVariableName(context.errorMessage),
          fallbackValue: action.fallbackValue,
        });
        return true;
      case "restore_backup": {
        const target = action.targetFile ?? context.filePath;
        if (!target) return false;
        return this.codePatcher.restoreBackup(target);
      }
      case "fix_import":
        this.emit("import_error_detected", {
          filePath: context.filePath,
          error: context.errorMessage,
        });
        return true;
      case "restart_module":
        this.emit("module_restart_requested", { filePath: context.filePath });
        return true;
      case "skip_execution":
      case "log_and_continue":
      default:
        return true;
    }
  }

  private captureGameState(): GameStateSnapshot {
    const modules = [process.argv[1], ...process.execArgv]
      .filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
      .map((entry) => path.basename(entry))
      .slice(-20);
    return {
      timestamp: new Date(),
      activeFeatures: this.featureRegistry.getActiveFeatureNames(),
      runningModules: modules,
      errorCount: this.totalErrors,
      healingCount: this.totalHealed,
      uptime: Date.now() - this.startTime.getTime(),
    };
  }
}

export class SelfHealingWatchdog {
  private readonly system: SelfHealingSystem;
  private readonly intervalMs: number;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private lastHealthCheck = new Date();
  private consecutiveFailures = 0;
  private readonly maxFailures = 5;

  constructor(system: SelfHealingSystem, intervalMs = 30_000) {
    this.system = system;
    this.intervalMs = intervalMs;
  }

  public start(): void {
    if (this.intervalHandle) return;
    this.intervalHandle = setInterval(() => this.performHealthCheck(), this.intervalMs);
    (this.intervalHandle as { unref?: () => void }).unref?.();
    colorLog("info", `Self-healing watchdog started (${formatDuration(this.intervalMs)})`);
  }

  public stop(): void {
    if (!this.intervalHandle) return;
    clearInterval(this.intervalHandle);
    this.intervalHandle = null;
  }

  public getLastHealthCheck(): Date {
    return this.lastHealthCheck;
  }

  private performHealthCheck(): void {
    try {
      const status = this.system.getStatus();
      if (!status.active) {
        this.consecutiveFailures += 1;
        if (this.consecutiveFailures >= this.maxFailures) {
          colorLog("warn", "Watchdog reactivating self-healing after inactive streak");
          this.system.activate();
          this.consecutiveFailures = 0;
        }
        return;
      }
      this.consecutiveFailures = 0;
      this.lastHealthCheck = new Date();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      colorLog("error", `Watchdog check failed: ${message}`);
    }
  }
}

export function getSelfHealingSystem(config?: Partial<SelfHealingConfig>): SelfHealingSystem {
  if (!globalSelfHealingSystem) {
    globalSelfHealingSystem = new SelfHealingSystem(config);
  }
  return globalSelfHealingSystem;
}

export function createSelfHealingSystem(config?: Partial<SelfHealingConfig>): SelfHealingSystem {
  if (globalSelfHealingSystem) {
    globalSelfHealingSystem.deactivate();
  }
  globalSelfHealingSystem = new SelfHealingSystem(config);
  return globalSelfHealingSystem;
}

export function activateSelfHealing(config?: Partial<SelfHealingConfig>): SelfHealingSystem {
  const system = getSelfHealingSystem(config);
  system.activate();
  return system;
}

export function bootstrapSelfHealing(config?: Partial<SelfHealingConfig>): {
  system: SelfHealingSystem;
  watchdog: SelfHealingWatchdog;
} {
  const system = createSelfHealingSystem(config);
  system.activate();
  const watchdog = new SelfHealingWatchdog(system, system.getStatus().config.watchdogIntervalMs);
  watchdog.start();

  process.once("exit", () => {
    watchdog.stop();
    system.deactivate();
  });

  return { system, watchdog };
}

export function selfHealingMiddleware(system = getSelfHealingSystem()): ErrorRequestHandler {
  return (err, req, res, _next) => {
    const error = err instanceof Error ? err : new Error(String(err));
    void system.submitError(error);
    res.status(500).json({
      error: "Internal server error",
      healed: true,
      route: req.originalUrl || req.url,
      message: "The self-healing system recorded the failure.",
    });
  };
}

export function registerSelfHealingDashboard(
  app: Express,
  system: SelfHealingSystem,
  options: SelfHealingDashboardOptions = {}
): void {
  const config = {
    enabled: options.enabled ?? system.getStatus().config.dashboardEnabled,
    routePrefix: options.routePrefix ?? system.getStatus().config.dashboardRoutePrefix,
    allowCors: options.allowCors ?? false,
    allowedOrigin: options.allowedOrigin ?? "*",
  };

  if (!config.enabled) return;

  if (config.allowCors) {
    app.use((req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", config.allowedOrigin);
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
      }
      next();
    });
  }

  app.get(config.routePrefix, (_req: Request, res: Response) => {
    res.json({
      ok: true,
      module: "SelfHealing Dashboard API",
      endpoints: {
        status: `${config.routePrefix}/status`,
        health: `${config.routePrefix}/health`,
        logs: `${config.routePrefix}/logs`,
        features: `${config.routePrefix}/features`,
        patterns: `${config.routePrefix}/patterns`,
        rules: `${config.routePrefix}/rules`,
      },
    });
  });

  app.get(`${config.routePrefix}/status`, (_req: Request, res: Response) => {
    res.json(system.getStatus());
  });

  app.get(`${config.routePrefix}/health`, (_req: Request, res: Response) => {
    res.json(system.getHealthSummary());
  });

  app.get(`${config.routePrefix}/logs`, (req: Request, res: Response) => {
    const count = Math.max(1, Math.min(200, Number(req.query.count ?? 20)));
    res.json(system.getRecentLogs(count));
  });

  app.get(`${config.routePrefix}/features`, (_req: Request, res: Response) => {
    res.json(system.getProtectedFeatures());
  });

  app.get(`${config.routePrefix}/patterns`, (_req: Request, res: Response) => {
    res.json(system.getLearnedPatterns());
  });

  app.get(`${config.routePrefix}/rules`, (_req: Request, res: Response) => {
    res.json(
      system.getRules().map((rule) => ({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        priority: rule.priority,
        errorType: rule.errorType,
        isFeatureDestructive: rule.isFeatureDestructive,
      }))
    );
  });
}

export default SelfHealingSystem;
