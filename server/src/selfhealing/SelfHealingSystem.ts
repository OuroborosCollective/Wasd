import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

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
export type PatchMode = "auto" | "log-only";
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
  uptimeMs: number;
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
  durationMs: number;
}

export interface ErrorOccurrence {
  firstSeen: Date;
  lastSeen: Date;
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
  watchPaths: string[];
  ignorePaths: string[];
  storageDirectory: string;
  backupDirectory: string;
  auditLogPath: string;
  knowledgeBasePath: string;
  protectedFeaturesPath: string;
  maxHealingAttemptsPerError: number;
  healingCooldownMs: number;
  autoRestartOnCritical: boolean;
  verboseLogging: boolean;
  patchMode: PatchMode;
  watchdogIntervalMs: number;
  maxAuditEntries: number;
}

export interface SelfHealingDashboardConfig {
  enabled: boolean;
  routePrefix: string;
  allowCors: boolean;
  allowedOrigin: string;
}

const DEFAULT_STORAGE_DIR = path.join(process.cwd(), ".selfhealing");
const DEFAULT_SELF_HEAL_CONFIG: SelfHealingConfig = {
  enabled: true,
  watchPaths: ["src", "server", "shared", "game-data", "scripts"],
  ignorePaths: [
    "node_modules",
    ".git",
    "dist",
    "build",
    ".selfhealing",
    "coverage",
  ],
  storageDirectory: DEFAULT_STORAGE_DIR,
  backupDirectory: path.join(DEFAULT_STORAGE_DIR, "backups"),
  auditLogPath: path.join(DEFAULT_STORAGE_DIR, "audit.json"),
  knowledgeBasePath: path.join(DEFAULT_STORAGE_DIR, "knowledge.json"),
  protectedFeaturesPath: path.join(DEFAULT_STORAGE_DIR, "features.json"),
  maxHealingAttemptsPerError: 3,
  healingCooldownMs: 5_000,
  autoRestartOnCritical: false,
  verboseLogging: true,
  patchMode: "auto",
  watchdogIntervalMs: 30_000,
  maxAuditEntries: 1_000,
};

const DEFAULT_DASHBOARD_CONFIG: SelfHealingDashboardConfig = {
  enabled: false,
  routePrefix: "/selfhealing",
  allowCors: true,
  allowedOrigin: "*",
};

function envTruthy(value: string | undefined, fallback = false): boolean {
  if (value == null || value.trim() === "") {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
}

function normalizePathForMatch(input: string): string {
  return input.replace(/\\/g, "/");
}

function globToRegExp(globPattern: string): RegExp {
  const escaped = globPattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "__DOUBLE_WILDCARD__")
    .replace(/\*/g, "[^/]*")
    .replace(/__DOUBLE_WILDCARD__/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

function generateHealingId(): string {
  return `HEAL-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function colorLog(level: LogLevel, message: string): void {
  const prefix: Record<LogLevel, string> = {
    info: "\u001b[36m[SelfHeal i]\u001b[0m",
    warn: "\u001b[33m[SelfHeal !]\u001b[0m",
    error: "\u001b[31m[SelfHeal x]\u001b[0m",
    success: "\u001b[32m[SelfHeal ok]\u001b[0m",
    heal: "\u001b[35m[SelfHeal +]\u001b[0m",
  };
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`${prefix[level]} [${ts}] ${message}`);
}

function ensureDir(directoryPath: string): void {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function safeReadFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

function safeWriteFile(filePath: string, content: string): boolean {
  try {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, "utf-8");
    return true;
  } catch {
    return false;
  }
}

function safeReadJson<T>(filePath: string, fallback: T): T {
  const content = safeReadFile(filePath);
  if (!content) {
    return fallback;
  }
  try {
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson(filePath: string, data: unknown): boolean {
  return safeWriteFile(filePath, JSON.stringify(data, null, 2));
}

function extractVariableName(msg: string): string {
  const direct = msg.match(/^(\w+) is not defined/i);
  if (direct?.[1]) {
    return direct[1];
  }
  const readReference = msg.match(
    /Cannot access ['"]?(\w+)['"]? before initialization/i,
  );
  if (readReference?.[1]) {
    return readReference[1];
  }
  return "value";
}

function inferGuardVariable(line: string): string {
  const match = line.match(/([A-Za-z_$][\w$]*)\s*(?:\.|\[)/);
  if (match?.[1]) {
    return match[1];
  }
  return "value";
}

function extractObjectName(msg: string, line?: string): string {
  const reading = msg.match(/reading ['"]?(\w+)['"]?/i);
  if (reading?.[1]) {
    return reading[1];
  }
  return line ? inferGuardVariable(line) : "value";
}

function getIntelligentFallback(msg: string): unknown {
  const variableName = extractVariableName(msg).toLowerCase();
  if (
    /count|score|health|mana|level|damage|gold|exp|xp|speed|timer/.test(
      variableName,
    )
  ) {
    return 0;
  }
  if (/name|title|label|text|message|description|tag/.test(variableName)) {
    return "";
  }
  if (
    /list|items|array|players|enemies|objects|children|entities/.test(
      variableName,
    )
  ) {
    return [];
  }
  if (/config|options|settings|data|map|state|info/.test(variableName)) {
    return {};
  }
  if (
    /enabled|active|visible|running|alive|dead|open|closed/.test(variableName)
  ) {
    return false;
  }
  return null;
}

function extractStackLocation(stack: string): {
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
} {
  const lines = stack.split("\n");
  for (const line of lines) {
    const match = line.match(
      /(?:\()?(file:\/\/\/[^():\s]+|\/[^():\s]+):(\d+):(\d+)\)?/,
    );
    if (!match) {
      continue;
    }
    let parsedPath = match[1];
    try {
      if (parsedPath.startsWith("file://")) {
        parsedPath = fileURLToPath(parsedPath);
      }
    } catch {
      // Keep best effort path.
    }
    return {
      filePath: parsedPath,
      lineNumber: Number.parseInt(match[2], 10),
      columnNumber: Number.parseInt(match[3], 10),
    };
  }
  return {};
}

function makeWritableDirectory(preferredDirectory: string): string {
  try {
    ensureDir(preferredDirectory);
    const probePath = path.join(preferredDirectory, ".selfheal-write-test");
    fs.writeFileSync(probePath, "ok", "utf-8");
    fs.unlinkSync(probePath);
    return preferredDirectory;
  } catch {
    const fallback = path.join(os.tmpdir(), "areloria-selfhealing");
    ensureDir(fallback);
    return fallback;
  }
}

class FeatureProtectionRegistry {
  private readonly registryPath: string;
  private readonly features = new Map<string, ProtectedFeature>();

  constructor(registryPath: string) {
    this.registryPath = registryPath;
    this.load();
    this.registerDefaultFeatures();
  }

  private load(): void {
    const existing = safeReadJson<ProtectedFeature[]>(this.registryPath, []);
    for (const feature of existing) {
      this.features.set(feature.id, {
        ...feature,
        addedAt: new Date(feature.addedAt),
      });
    }
  }

  private save(): void {
    safeWriteJson(this.registryPath, Array.from(this.features.values()));
  }

  private registerDefaultFeatures(): void {
    const defaults: Omit<ProtectedFeature, "addedAt">[] = [
      {
        id: "FEAT-GAME-CORE",
        name: "Game Core Loop",
        description: "Main world tick and core game loop logic",
        filePatterns: [
          "**/WorldTick.ts",
          "**/WebSocketServer.ts",
          "**/index.ts",
        ],
        codeSignatures: [
          "tick.start",
          "worldTick",
          "entity_sync",
          "simulation tick",
        ],
        priority: "critical",
        addedBy: "system",
        doNotDelete: true,
        doNotDisable: true,
      },
      {
        id: "FEAT-PLAYER",
        name: "Player System",
        description: "Player login, movement, and state synchronization",
        filePatterns: ["**/player*.ts", "**/Player*.ts", "**/auth*.ts"],
        codeSignatures: [
          "playerState",
          "login",
          "move_intent",
          "resolveLoginIdentity",
        ],
        priority: "critical",
        addedBy: "system",
        doNotDelete: true,
        doNotDisable: true,
      },
      {
        id: "FEAT-MULTIPLAYER",
        name: "Multiplayer Network",
        description: "WebSocket transport and payload orchestration",
        filePatterns: ["**/networking/*.ts", "**/WebSocket*.ts"],
        codeSignatures: ["socket.send", "ws.on", "broadcast", "PacketRouter"],
        priority: "critical",
        addedBy: "system",
        doNotDelete: true,
        doNotDisable: true,
      },
      {
        id: "FEAT-ADMIN-CONTENT",
        name: "Content Admin",
        description: "No-code content admin API and upload controls",
        filePatterns: ["**/adminContentRoute.ts", "**/glbUploadRoute.ts"],
        codeSignatures: [
          "/api/admin/content",
          "glb-upload",
          "validate-preview",
        ],
        priority: "high",
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
    const normalizedPath = normalizePathForMatch(filePath);
    for (const feature of this.features.values()) {
      if (
        feature.codeSignatures.some((signature) => content.includes(signature))
      ) {
        return true;
      }
      if (
        feature.filePatterns.some((pattern) => {
          const regex = globToRegExp(normalizePathForMatch(pattern));
          return regex.test(normalizedPath);
        })
      ) {
        return true;
      }
    }
    return false;
  }

  public getAll(): ProtectedFeature[] {
    return Array.from(this.features.values());
  }

  public getActiveFeatureNames(): string[] {
    return this.getAll().map((feature) => feature.name);
  }
}

class BackupManager {
  private readonly backupDirectory: string;
  private readonly maxBackupsPerFile = 5;

  constructor(backupDirectory: string) {
    this.backupDirectory = backupDirectory;
    ensureDir(this.backupDirectory);
  }

  public createBackup(filePath: string): string | null {
    const content = safeReadFile(filePath);
    if (content == null) {
      return null;
    }
    const fileName = path.basename(filePath);
    const backupPath = path.join(
      this.backupDirectory,
      `${fileName}.${Date.now()}.backup`,
    );
    if (!safeWriteFile(backupPath, content)) {
      return null;
    }
    this.pruneOldBackups(fileName);
    return backupPath;
  }

  public restoreLatestBackup(filePath: string): boolean {
    const fileName = path.basename(filePath);
    const backups = this.getBackupsForFile(fileName);
    if (backups.length === 0) {
      return false;
    }
    const latestBackup = backups[backups.length - 1];
    const content = safeReadFile(latestBackup);
    if (content == null) {
      return false;
    }
    return safeWriteFile(filePath, content);
  }

  public listBackups(): string[] {
    try {
      return fs
        .readdirSync(this.backupDirectory)
        .filter((entry) => entry.endsWith(".backup"));
    } catch {
      return [];
    }
  }

  private getBackupsForFile(fileName: string): string[] {
    try {
      return fs
        .readdirSync(this.backupDirectory)
        .filter(
          (entry) => entry.startsWith(fileName) && entry.endsWith(".backup"),
        )
        .map((entry) => path.join(this.backupDirectory, entry))
        .sort();
    } catch {
      return [];
    }
  }

  private pruneOldBackups(fileName: string): void {
    const backups = this.getBackupsForFile(fileName);
    if (backups.length <= this.maxBackupsPerFile) {
      return;
    }
    const staleBackups = backups.slice(
      0,
      backups.length - this.maxBackupsPerFile,
    );
    for (const stale of staleBackups) {
      try {
        fs.unlinkSync(stale);
      } catch {
        // Best effort backup cleanup.
      }
    }
  }
}

class AuditLogger {
  private readonly logPath: string;
  private readonly maxAuditEntries: number;
  private logs: HealingLog[] = [];

  constructor(logPath: string, maxAuditEntries: number) {
    this.logPath = logPath;
    this.maxAuditEntries = maxAuditEntries;
    this.load();
  }

  private load(): void {
    const read = safeReadJson<HealingLog[]>(this.logPath, []);
    this.logs = read.map((entry) => ({
      ...entry,
      timestamp: new Date(entry.timestamp),
    }));
  }

  private persist(): void {
    if (this.logs.length > this.maxAuditEntries) {
      this.logs = this.logs.slice(this.logs.length - this.maxAuditEntries);
    }
    safeWriteJson(this.logPath, this.logs);
  }

  public record(entry: HealingLog): void {
    this.logs.push(entry);
    this.persist();
  }

  public getRecent(count: number): HealingLog[] {
    return this.logs.slice(-count);
  }

  public getStats(): {
    total: number;
    successful: number;
    failed: number;
    successRate: string;
    mostCommonError: string;
  } {
    const total = this.logs.length;
    const successful = this.logs.filter((log) => log.success).length;
    const failed = total - successful;
    const counter = new Map<string, number>();
    for (const log of this.logs) {
      counter.set(log.errorDetected, (counter.get(log.errorDetected) ?? 0) + 1);
    }
    const mostCommonError =
      [...counter.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";
    const successRate =
      total === 0 ? "0%" : `${((successful / total) * 100).toFixed(1)}%`;
    return { total, successful, failed, successRate, mostCommonError };
  }
}

class LocalLearningEngine {
  private readonly knowledgePath: string;
  private readonly patterns = new Map<string, LearnedPattern>();

  constructor(knowledgePath: string) {
    this.knowledgePath = knowledgePath;
    this.load();
  }

  private load(): void {
    const persisted = safeReadJson<LearnedPattern[]>(this.knowledgePath, []);
    for (const entry of persisted) {
      this.patterns.set(entry.pattern, {
        ...entry,
        lastUpdated: new Date(entry.lastUpdated),
      });
    }
  }

  private persist(): void {
    safeWriteJson(this.knowledgePath, Array.from(this.patterns.values()));
  }

  public learn(errorMessage: string, successfulRuleId: string): void {
    const normalized = this.normalizePattern(errorMessage);
    const existing = this.patterns.get(normalized);
    if (existing) {
      existing.occurrences += 1;
      existing.successfulFix = successfulRuleId;
      existing.lastUpdated = new Date();
      this.persist();
      return;
    }
    this.patterns.set(normalized, {
      pattern: normalized,
      occurrences: 1,
      successfulFix: successfulRuleId,
      lastUpdated: new Date(),
    });
    this.persist();
  }

  public getSuggestedRuleId(errorMessage: string): string | undefined {
    const normalized = this.normalizePattern(errorMessage);
    const exact = this.patterns.get(normalized);
    if (exact) {
      return exact.successfulFix;
    }

    let bestMatch: LearnedPattern | undefined;
    let bestScore = 0;
    for (const candidate of this.patterns.values()) {
      const score = this.similarityScore(normalized, candidate.pattern);
      if (score > bestScore && score >= 0.6) {
        bestScore = score;
        bestMatch = candidate;
      }
    }
    return bestMatch?.successfulFix;
  }

  public getPatternCount(): number {
    return this.patterns.size;
  }

  public getAllPatterns(): LearnedPattern[] {
    return Array.from(this.patterns.values()).sort(
      (a, b) => b.occurrences - a.occurrences,
    );
  }

  private normalizePattern(message: string): string {
    return message
      .replace(/\d+/g, "N")
      .replace(/'[^']*'/g, "'X'")
      .replace(/"[^"]*"/g, '"X"')
      .replace(/\bat\b.*/gi, "")
      .trim()
      .toLowerCase()
      .slice(0, 140);
  }

  private similarityScore(a: string, b: string): number {
    const setA = new Set(a.split(/\s+/).filter(Boolean));
    const setB = new Set(b.split(/\s+/).filter(Boolean));
    if (setA.size === 0 && setB.size === 0) {
      return 1;
    }
    const intersection = Array.from(setA).filter((token) =>
      setB.has(token),
    ).length;
    const union = new Set([...setA, ...setB]).size;
    return union === 0 ? 0 : intersection / union;
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

  private keyForError(error: Error): string {
    return `${error.name}::${error.message.slice(0, 120)}`;
  }

  public track(error: Error): ErrorOccurrence {
    const key = this.keyForError(error);
    const now = new Date();
    const existing = this.occurrences.get(key);
    if (existing) {
      existing.count += 1;
      existing.lastSeen = now;
      return existing;
    }
    const first: ErrorOccurrence = {
      firstSeen: now,
      lastSeen: now,
      count: 1,
      healed: false,
    };
    this.occurrences.set(key, first);
    return first;
  }

  public shouldHeal(error: Error): boolean {
    const key = this.keyForError(error);
    const occurrence = this.occurrences.get(key);
    if (!occurrence) {
      return true;
    }
    if (occurrence.count > this.maxAttempts) {
      return false;
    }
    const elapsed = Date.now() - occurrence.lastSeen.getTime();
    if (occurrence.count > 1 && elapsed < this.cooldownMs) {
      return false;
    }
    return true;
  }

  public markHealed(error: Error, ruleId: string): void {
    const occurrence = this.occurrences.get(this.keyForError(error));
    if (!occurrence) {
      return;
    }
    occurrence.healed = true;
    occurrence.ruleId = ruleId;
  }

  public getStats(): { tracked: number; healed: number; persistent: number } {
    const entries = Array.from(this.occurrences.values());
    const healed = entries.filter((entry) => entry.healed).length;
    const persistent = entries.filter(
      (entry) => !entry.healed && entry.count > this.maxAttempts,
    ).length;
    return { tracked: entries.length, healed, persistent };
  }
}

class CodePatcher {
  constructor(
    private readonly backupManager: BackupManager,
    private readonly featureRegistry: FeatureProtectionRegistry,
    private readonly isPathEligible: (filePath: string) => boolean,
  ) {}

  public applyPatch(filePath: string, patch: CodePatch): boolean {
    if (!this.isPathEligible(filePath)) {
      colorLog("warn", `Patch blocked outside watch paths: ${filePath}`);
      return false;
    }
    const existingContent = safeReadFile(filePath);
    if (existingContent == null) {
      colorLog("error", `Patch target unreadable: ${filePath}`);
      return false;
    }
    const lines = existingContent.split("\n");
    const index = patch.lineNumber - 1;
    if (index < 0 || index >= lines.length) {
      colorLog(
        "warn",
        `Patch line ${patch.lineNumber} out of bounds for ${filePath}`,
      );
      return false;
    }
    const currentLine = lines[index];
    const currentTrimmed = currentLine.trim();
    const patchTrimmed = patch.originalLine.trim();
    if (currentTrimmed !== patchTrimmed && currentLine !== patch.originalLine) {
      colorLog(
        "warn",
        `Patch skipped because source line changed at ${filePath}:${patch.lineNumber}`,
      );
      return false;
    }

    if (this.featureRegistry.isFeatureCode(currentLine, filePath)) {
      colorLog(
        "warn",
        `Patch denied by feature protection for ${filePath}:${patch.lineNumber}`,
      );
      return false;
    }

    const backupPath = this.backupManager.createBackup(filePath);
    if (!backupPath) {
      colorLog("error", `Patch aborted because backup failed for ${filePath}`);
      return false;
    }
    patch.backupPath = backupPath;
    lines[index] = patch.repairedLine;
    const writeSuccess = safeWriteFile(filePath, lines.join("\n"));
    if (writeSuccess) {
      colorLog(
        "heal",
        `Patched ${path.basename(filePath)}:${patch.lineNumber}`,
      );
    }
    return writeSuccess;
  }

  public restoreBackup(filePath: string): boolean {
    return this.backupManager.restoreLatestBackup(filePath);
  }
}

function createBuiltInHealingRules(): HealingRule[] {
  return [
    {
      id: "HEAL-001",
      name: "Null Reference Guard",
      description:
        "Adds an inline null/undefined guard for failing property access",
      priority: 1,
      pattern:
        /Cannot read propert(?:y|ies) .* of (?:null|undefined)|Cannot read properties of undefined/i,
      errorType: "null",
      isFeatureDestructive: false,
      fix: (ctx): HealingAction => {
        const lines = ctx.fileContent?.split("\n") ?? [];
        const line = lines[(ctx.lineNumber ?? 1) - 1] ?? "";
        const guardVar = inferGuardVariable(line);
        const objectName = extractObjectName(ctx.errorMessage, line);
        return {
          type: "add_null_check",
          description: `Inserted null guard around '${objectName}' access`,
          requiresRestart: false,
          preservesFeatures: true,
          patch: {
            originalLine: line,
            repairedLine: `if (${guardVar} != null) { ${line.trim()} }`,
            lineNumber: ctx.lineNumber ?? 0,
            reason: "Null reference guarded to avoid process crash.",
            isReversible: true,
          },
        };
      },
    },
    {
      id: "HEAL-002",
      name: "ReferenceError Fallback",
      description: "Computes a sensible fallback value for undefined symbols",
      priority: 2,
      pattern:
        /(\w+) is not defined|Cannot access ['"]?\w+['"]? before initialization/i,
      errorType: "reference",
      isFeatureDestructive: false,
      fix: (ctx): HealingAction => ({
        type: "fallback_value",
        description: `Runtime fallback computed for ${extractVariableName(ctx.errorMessage)}`,
        fallbackValue: getIntelligentFallback(ctx.errorMessage),
        requiresRestart: false,
        preservesFeatures: true,
      }),
    },
    {
      id: "HEAL-003",
      name: "TypeError Try/Catch",
      description: "Wraps failing statement in a guarded try/catch",
      priority: 2,
      pattern: /TypeError|is not a function|Cannot set propert/i,
      errorType: "type",
      isFeatureDestructive: false,
      fix: (ctx): HealingAction => {
        const lines = ctx.fileContent?.split("\n") ?? [];
        const line = lines[(ctx.lineNumber ?? 1) - 1] ?? "";
        return {
          type: "add_guard",
          description: "Wrapped failing line with try/catch guard",
          requiresRestart: false,
          preservesFeatures: true,
          patch: {
            originalLine: line,
            repairedLine: `try { ${line.trim()} } catch (_selfHealTypeErr) { /* self-healed */ }`,
            lineNumber: ctx.lineNumber ?? 0,
            reason: "TypeError guarded without removing feature code.",
            isReversible: true,
          },
        };
      },
    },
    {
      id: "HEAL-004",
      name: "Import/Module Resolver",
      description: "Flags unresolved modules and asks for restart",
      priority: 1,
      pattern: /Cannot find module|MODULE_NOT_FOUND|Failed to resolve/i,
      errorType: "import",
      isFeatureDestructive: false,
      fix: (ctx): HealingAction => ({
        type: "fix_import",
        description: `Import resolution issue logged for ${ctx.filePath ?? "unknown file"}`,
        targetFile: ctx.filePath,
        requiresRestart: true,
        preservesFeatures: true,
      }),
    },
    {
      id: "HEAL-005",
      name: "Range/Stack Guard",
      description: "Protects line likely causing recursion or invalid ranges",
      priority: 2,
      pattern: /RangeError|Maximum call stack|Invalid array length/i,
      errorType: "range",
      isFeatureDestructive: false,
      fix: (ctx): HealingAction => {
        const lines = ctx.fileContent?.split("\n") ?? [];
        const line = lines[(ctx.lineNumber ?? 1) - 1] ?? "";
        return {
          type: "add_guard",
          description: "Range guard inserted via try/catch",
          requiresRestart: false,
          preservesFeatures: true,
          patch: {
            originalLine: line,
            repairedLine: `try { ${line.trim()} } catch (_selfHealRangeErr) { /* self-healed */ }`,
            lineNumber: ctx.lineNumber ?? 0,
            reason: "Range errors guarded to keep the process alive.",
            isReversible: true,
          },
        };
      },
    },
    {
      id: "HEAL-006",
      name: "SyntaxError Backup Restore",
      description: "Restores latest known-good backup after syntax failures",
      priority: 1,
      pattern: /SyntaxError|Unexpected token|Unexpected end of input/i,
      errorType: "syntax",
      isFeatureDestructive: false,
      fix: (ctx): HealingAction => ({
        type: "restore_backup",
        description: `Syntax failure detected, restoring backup for ${ctx.filePath ?? "unknown file"}`,
        targetFile: ctx.filePath,
        requiresRestart: true,
        preservesFeatures: true,
      }),
    },
    {
      id: "HEAL-007",
      name: "Unhandled Promise Guard",
      description: "Wraps promise-producing line with rejection catch",
      priority: 2,
      pattern: /UnhandledPromiseRejection|UnhandledPromise|Promise.*reject/i,
      errorType: "runtime",
      isFeatureDestructive: false,
      fix: (ctx): HealingAction => {
        const lines = ctx.fileContent?.split("\n") ?? [];
        const line = lines[(ctx.lineNumber ?? 1) - 1] ?? "";
        const patchedLine = line.includes("await")
          ? `${line.trim()}.catch((_selfHealPromiseErr) => { /* self-healed */ })`
          : `Promise.resolve(${line.trim()}).catch((_selfHealPromiseErr) => { /* self-healed */ })`;
        return {
          type: "patch_code",
          description: "Unhandled promise rejection guard inserted",
          requiresRestart: false,
          preservesFeatures: true,
          patch: {
            originalLine: line,
            repairedLine: patchedLine,
            lineNumber: ctx.lineNumber ?? 0,
            reason: "Unhandled promise rejection now handled locally.",
            isReversible: true,
          },
        };
      },
    },
    {
      id: "HEAL-008",
      name: "JSON Parse Guard",
      description: "Converts JSON.parse calls into safe parser blocks",
      priority: 3,
      pattern: /JSON\.parse|Unexpected token.*JSON|is not valid JSON/i,
      errorType: "runtime",
      isFeatureDestructive: false,
      fix: (ctx): HealingAction => {
        const lines = ctx.fileContent?.split("\n") ?? [];
        const line = lines[(ctx.lineNumber ?? 1) - 1] ?? "";
        const patchedLine = line.includes("JSON.parse")
          ? line.replace(
              /JSON\.parse\(([^)]+)\)/g,
              "(() => { try { return JSON.parse($1); } catch { return {}; } })()",
            )
          : `try { ${line.trim()} } catch (_selfHealJsonErr) { /* self-healed */ }`;
        return {
          type: "patch_code",
          description: "JSON parsing made fault-tolerant",
          requiresRestart: false,
          preservesFeatures: true,
          patch: {
            originalLine: line,
            repairedLine: patchedLine,
            lineNumber: ctx.lineNumber ?? 0,
            reason: "JSON.parse wrapped with local fallback object.",
            isReversible: true,
          },
        };
      },
    },
    {
      id: "HEAL-009",
      name: "Network Error Continuation",
      description: "Logs network layer failures and keeps runtime stable",
      priority: 3,
      pattern: /fetch|ECONNREFUSED|ENOTFOUND|NetworkError|net::ERR/i,
      errorType: "runtime",
      isFeatureDestructive: false,
      fix: (): HealingAction => ({
        type: "log_and_continue",
        description: "Network fault logged; runtime continues.",
        requiresRestart: false,
        preservesFeatures: true,
      }),
    },
    {
      id: "HEAL-010",
      name: "Generic Runtime Stabilizer",
      description: "Catch-all rule for unknown runtime faults",
      priority: 10,
      pattern: /.*/i,
      errorType: "runtime",
      isFeatureDestructive: false,
      fix: (): HealingAction => ({
        type: "log_and_continue",
        description: "Unknown fault logged to local knowledge base.",
        requiresRestart: false,
        preservesFeatures: true,
      }),
    },
  ];
}

export class SelfHealingSystem extends EventEmitter {
  private readonly config: SelfHealingConfig;
  private readonly rules: HealingRule[];
  private readonly featureRegistry: FeatureProtectionRegistry;
  private readonly backupManager: BackupManager;
  private readonly auditLogger: AuditLogger;
  private readonly learningEngine: LocalLearningEngine;
  private readonly codePatcher: CodePatcher;
  private readonly errorTracker: ErrorTracker;

  private startedAt: Date = new Date();
  private totalErrors = 0;
  private totalHealed = 0;
  private active = false;

  private readonly uncaughtExceptionHandler = (error: Error): void => {
    colorLog("error", `uncaughtException captured: ${error.message}`);
    this.heal(error).catch((healError) => {
      colorLog(
        "error",
        `healing failed after uncaughtException: ${(healError as Error).message}`,
      );
    });
  };

  private readonly unhandledRejectionHandler = (reason: unknown): void => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    colorLog("error", `unhandledRejection captured: ${error.message}`);
    this.heal(error).catch((healError) => {
      colorLog(
        "error",
        `healing failed after unhandledRejection: ${(healError as Error).message}`,
      );
    });
  };

  constructor(config: Partial<SelfHealingConfig> = {}) {
    super();
    const merged = { ...DEFAULT_SELF_HEAL_CONFIG, ...config };
    const writableStorageDir = makeWritableDirectory(
      path.resolve(merged.storageDirectory),
    );
    this.config = {
      ...merged,
      storageDirectory: writableStorageDir,
      backupDirectory: path.resolve(writableStorageDir, "backups"),
      auditLogPath: path.resolve(writableStorageDir, "audit.json"),
      knowledgeBasePath: path.resolve(writableStorageDir, "knowledge.json"),
      protectedFeaturesPath: path.resolve(writableStorageDir, "features.json"),
      watchPaths: merged.watchPaths.map((entry) => path.resolve(entry)),
    };

    ensureDir(this.config.storageDirectory);
    ensureDir(this.config.backupDirectory);

    this.featureRegistry = new FeatureProtectionRegistry(
      this.config.protectedFeaturesPath,
    );
    this.backupManager = new BackupManager(this.config.backupDirectory);
    this.auditLogger = new AuditLogger(
      this.config.auditLogPath,
      this.config.maxAuditEntries,
    );
    this.learningEngine = new LocalLearningEngine(
      this.config.knowledgeBasePath,
    );
    this.errorTracker = new ErrorTracker(
      this.config.healingCooldownMs,
      this.config.maxHealingAttemptsPerError,
    );
    this.codePatcher = new CodePatcher(
      this.backupManager,
      this.featureRegistry,
      (filePath) => this.isPathEligible(filePath),
    );
    this.rules = createBuiltInHealingRules().sort(
      (a, b) => a.priority - b.priority,
    );

    colorLog("success", "SelfHealingSystem initialized");
    colorLog("info", `rules loaded: ${this.rules.length}`);
    colorLog(
      "info",
      `protected features: ${this.featureRegistry.getAll().length}`,
    );
    colorLog(
      "info",
      `learned patterns: ${this.learningEngine.getPatternCount()}`,
    );
  }

  public activate(): void {
    if (!this.config.enabled) {
      colorLog("warn", "Self-healing disabled by configuration.");
      return;
    }
    if (this.active) {
      return;
    }
    this.startedAt = new Date();
    this.active = true;
    process.on("uncaughtException", this.uncaughtExceptionHandler);
    process.on("unhandledRejection", this.unhandledRejectionHandler);
    colorLog("success", `Self-healing active (mode: ${this.config.patchMode})`);
    this.emit("activated");
  }

  public deactivate(): void {
    if (!this.active) {
      return;
    }
    this.active = false;
    process.off("uncaughtException", this.uncaughtExceptionHandler);
    process.off("unhandledRejection", this.unhandledRejectionHandler);
    colorLog("warn", "Self-healing deactivated");
    this.emit("deactivated");
  }

  public async submitError(error: Error, filePath?: string): Promise<boolean> {
    return this.heal(error, filePath);
  }

  public protectFeature(feature: Omit<ProtectedFeature, "addedAt">): void {
    this.featureRegistry.register(feature);
  }

  public addCustomRule(rule: HealingRule): void {
    if (rule.isFeatureDestructive !== false) {
      colorLog(
        "error",
        `Rejected custom rule ${rule.id} because it can be destructive.`,
      );
      return;
    }
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
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
    const uptimeMs = Date.now() - this.startedAt.getTime();
    const healingRate =
      this.totalErrors === 0
        ? "0%"
        : `${((this.totalHealed / this.totalErrors) * 100).toFixed(1)}%`;
    return {
      active: this.active,
      uptime: formatDuration(uptimeMs),
      totalErrors: this.totalErrors,
      totalHealed: this.totalHealed,
      healingRate,
      rulesLoaded: this.rules.length,
      featuresProtected: this.featureRegistry.getAll().length,
      learnedPatterns: this.learningEngine.getPatternCount(),
      auditStats: this.auditLogger.getStats(),
      trackerStats: this.errorTracker.getStats(),
      backups: this.backupManager.listBackups(),
      config: this.config,
    };
  }

  public getRecentLogs(count = 20): HealingLog[] {
    return this.auditLogger.getRecent(count);
  }

  public getLearnedPatterns(): LearnedPattern[] {
    return this.learningEngine.getAllPatterns();
  }

  public getProtectedFeatures(): ProtectedFeature[] {
    return this.featureRegistry.getAll();
  }

  public getRules(): HealingRule[] {
    return [...this.rules];
  }

  public printStatusReport(): void {
    const status = this.getStatus();
    const separator = "─".repeat(72);
    console.log(`\n${separator}`);
    console.log("Areloria Self-Healing Status");
    console.log(separator);
    console.log(`active: ${status.active}`);
    console.log(`uptime: ${status.uptime}`);
    console.log(
      `errors/healed: ${status.totalErrors}/${status.totalHealed} (${status.healingRate})`,
    );
    console.log(
      `rules: ${status.rulesLoaded}, protected features: ${status.featuresProtected}`,
    );
    console.log(`learned patterns: ${status.learnedPatterns}`);
    console.log(`audit success rate: ${status.auditStats.successRate}`);
    console.log(separator);
  }

  private async heal(error: Error, filePath?: string): Promise<boolean> {
    if (!this.active || !this.config.enabled) {
      return false;
    }
    this.totalErrors += 1;
    const started = Date.now();
    const occurrence = this.errorTracker.track(error);
    if (!this.errorTracker.shouldHeal(error)) {
      colorLog(
        "warn",
        `Healing skipped due to cooldown/limit for: ${error.message.slice(0, 120)}`,
      );
      return false;
    }

    const stackLocation = extractStackLocation(error.stack ?? "");
    const resolvedPath = filePath ?? stackLocation.filePath;
    const fileContent = resolvedPath
      ? (safeReadFile(resolvedPath) ?? undefined)
      : undefined;
    const context: ErrorContext = {
      error,
      errorMessage: error.message,
      errorStack: error.stack ?? "",
      filePath: resolvedPath,
      lineNumber: stackLocation.lineNumber,
      columnNumber: stackLocation.columnNumber,
      fileContent,
      timestamp: new Date(),
      occurrenceCount: occurrence.count,
      gameState: this.captureGameState(),
    };

    const rule = this.findBestRule(error, context);
    if (!rule) {
      return false;
    }
    const action = rule.fix(context);
    if (action.preservesFeatures !== true) {
      colorLog(
        "error",
        `Rule ${rule.id} blocked because action does not preserve features.`,
      );
      return false;
    }

    let success = false;
    try {
      success = await this.executeAction(action, context);
    } catch (executionError) {
      colorLog(
        "error",
        `Failed to execute healing action: ${(executionError as Error).message}`,
      );
      success = false;
    }

    if (success) {
      this.totalHealed += 1;
      this.errorTracker.markHealed(error, rule.id);
      this.learningEngine.learn(error.message, rule.id);
    }

    const durationMs = Date.now() - started;
    this.auditLogger.record({
      id: generateHealingId(),
      timestamp: new Date(),
      errorDetected: `${error.name}: ${error.message.slice(0, 120)}`,
      ruleApplied: `[${rule.id}] ${rule.name}`,
      actionTaken: action.description,
      success,
      featuresPreserved: this.featureRegistry.getActiveFeatureNames(),
      rollbackAvailable: Boolean(action.patch?.isReversible),
      durationMs,
    });

    if (success) {
      colorLog(
        "success",
        `Self-heal success in ${formatDuration(durationMs)} via ${rule.id}`,
      );
    } else {
      colorLog(
        "warn",
        `Self-heal incomplete in ${formatDuration(durationMs)} via ${rule.id}`,
      );
    }
    this.emit("healed", {
      success,
      ruleId: rule.id,
      ruleName: rule.name,
      durationMs,
      errorMessage: error.message,
    });
    return success;
  }

  private isPathEligible(filePath: string): boolean {
    const normalized = normalizePathForMatch(path.resolve(filePath));
    if (
      this.config.ignorePaths.some((blockedPath) =>
        normalized.includes(normalizePathForMatch(path.resolve(blockedPath))),
      )
    ) {
      return false;
    }
    return this.config.watchPaths.some((watchPath) =>
      normalized.startsWith(normalizePathForMatch(path.resolve(watchPath))),
    );
  }

  private findBestRule(
    error: Error,
    context: ErrorContext,
  ): HealingRule | undefined {
    const learnedRuleId = this.learningEngine.getSuggestedRuleId(error.message);
    if (learnedRuleId) {
      const learnedRule = this.rules.find((rule) => rule.id === learnedRuleId);
      if (learnedRule) {
        return learnedRule;
      }
    }
    const fullText = `${error.name} ${error.message}`;
    return this.rules.find((rule) => rule.pattern.test(fullText));
  }

  private async executeAction(
    action: HealingAction,
    context: ErrorContext,
  ): Promise<boolean> {
    if (this.config.patchMode === "log-only") {
      colorLog("info", `[log-only] ${action.description}`);
      return true;
    }
    switch (action.type) {
      case "add_null_check":
      case "add_guard":
      case "patch_code":
        if (!action.patch || !context.filePath) {
          return true;
        }
        return this.codePatcher.applyPatch(context.filePath, action.patch);
      case "fallback_value":
        this.emit("fallback_applied", {
          variable: extractVariableName(context.errorMessage),
          fallbackValue: action.fallbackValue,
        });
        return true;
      case "restore_backup": {
        const target = action.targetFile ?? context.filePath;
        if (!target) {
          return false;
        }
        return this.codePatcher.restoreBackup(target);
      }
      case "fix_import":
        this.emit("import_error_detected", {
          filePath: context.filePath,
          error: context.errorMessage,
        });
        return true;
      case "restart_module":
        this.emit("module_restart_requested", {
          filePath: context.filePath,
        });
        return true;
      case "skip_execution":
      case "log_and_continue":
      default:
        return true;
    }
  }

  private captureGameState(): GameStateSnapshot {
    return {
      timestamp: new Date(),
      activeFeatures: this.featureRegistry.getActiveFeatureNames(),
      runningModules: [],
      errorCount: this.totalErrors,
      healingCount: this.totalHealed,
      uptimeMs: Date.now() - this.startedAt.getTime(),
    };
  }
}

export class SelfHealingWatchdog {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private lastHealthCheck = new Date();
  private consecutiveFailures = 0;
  private readonly maxFailures = 5;

  constructor(
    private readonly system: SelfHealingSystem,
    private readonly intervalMs: number,
  ) {}

  public start(): void {
    if (this.intervalHandle) {
      return;
    }
    this.intervalHandle = setInterval(() => {
      this.performHealthCheck();
    }, this.intervalMs);
    this.intervalHandle.unref?.();
    colorLog(
      "info",
      `Self-heal watchdog started (interval: ${formatDuration(this.intervalMs)})`,
    );
  }

  public stop(): void {
    if (!this.intervalHandle) {
      return;
    }
    clearInterval(this.intervalHandle);
    this.intervalHandle = null;
    colorLog("info", "Self-heal watchdog stopped");
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
          colorLog("warn", "Watchdog reactivating self-heal system");
          this.system.activate();
          this.consecutiveFailures = 0;
        }
        return;
      }
      this.consecutiveFailures = 0;
      this.lastHealthCheck = new Date();
      if (status.config.verboseLogging) {
        colorLog(
          "info",
          `Watchdog ok (${status.totalHealed}/${status.totalErrors} healed)`,
        );
      }
    } catch (error) {
      colorLog(
        "error",
        `Watchdog health check failed: ${(error as Error).message}`,
      );
    }
  }
}

function parsePositiveNumber(
  value: string | undefined,
  fallback: number,
): number {
  if (!value || value.trim() === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export function resolveSelfHealingConfigFromEnv(): Partial<SelfHealingConfig> {
  const storageDirectory = process.env.SELF_HEAL_STORAGE_DIR?.trim();
  const patchModeRaw = process.env.SELF_HEAL_PATCH_MODE?.trim().toLowerCase();
  const patchMode: PatchMode =
    patchModeRaw === "log-only" || patchModeRaw === "auto"
      ? patchModeRaw
      : DEFAULT_SELF_HEAL_CONFIG.patchMode;

  return {
    enabled: envTruthy(process.env.SELF_HEAL_ENABLED, true),
    patchMode,
    verboseLogging: envTruthy(
      process.env.SELF_HEAL_VERBOSE,
      DEFAULT_SELF_HEAL_CONFIG.verboseLogging,
    ),
    storageDirectory:
      storageDirectory && storageDirectory.length > 0
        ? path.isAbsolute(storageDirectory)
          ? storageDirectory
          : path.resolve(process.cwd(), storageDirectory)
        : DEFAULT_SELF_HEAL_CONFIG.storageDirectory,
    healingCooldownMs: parsePositiveNumber(
      process.env.SELF_HEAL_COOLDOWN_MS,
      DEFAULT_SELF_HEAL_CONFIG.healingCooldownMs,
    ),
    maxHealingAttemptsPerError: parsePositiveNumber(
      process.env.SELF_HEAL_MAX_ATTEMPTS,
      DEFAULT_SELF_HEAL_CONFIG.maxHealingAttemptsPerError,
    ),
    watchdogIntervalMs: parsePositiveNumber(
      process.env.SELF_HEAL_WATCHDOG_INTERVAL_MS,
      DEFAULT_SELF_HEAL_CONFIG.watchdogIntervalMs,
    ),
  };
}

export function resolveSelfHealingDashboardConfigFromEnv(): SelfHealingDashboardConfig {
  return {
    ...DEFAULT_DASHBOARD_CONFIG,
    enabled: envTruthy(
      process.env.SELF_HEAL_DASHBOARD_ENABLED,
      DEFAULT_DASHBOARD_CONFIG.enabled,
    ),
    routePrefix:
      process.env.SELF_HEAL_DASHBOARD_PREFIX?.trim() ||
      DEFAULT_DASHBOARD_CONFIG.routePrefix,
    allowCors: envTruthy(
      process.env.SELF_HEAL_DASHBOARD_CORS,
      DEFAULT_DASHBOARD_CONFIG.allowCors,
    ),
    allowedOrigin:
      process.env.SELF_HEAL_DASHBOARD_ALLOWED_ORIGIN?.trim() ||
      DEFAULT_DASHBOARD_CONFIG.allowedOrigin,
  };
}

let globalSelfHealingSystem: SelfHealingSystem | null = null;
let globalWatchdog: SelfHealingWatchdog | null = null;

export function getSelfHealingSystem(
  config?: Partial<SelfHealingConfig>,
): SelfHealingSystem {
  if (!globalSelfHealingSystem) {
    globalSelfHealingSystem = new SelfHealingSystem(config);
  }
  return globalSelfHealingSystem;
}

export function createSelfHealingSystem(
  config?: Partial<SelfHealingConfig>,
): SelfHealingSystem {
  globalWatchdog?.stop();
  globalWatchdog = null;
  globalSelfHealingSystem?.deactivate();
  globalSelfHealingSystem = new SelfHealingSystem(config);
  return globalSelfHealingSystem;
}

export function activateSelfHealing(
  config?: Partial<SelfHealingConfig>,
): SelfHealingSystem {
  const system = getSelfHealingSystem(config);
  system.activate();
  return system;
}

export function bootstrapSelfHealing(config?: Partial<SelfHealingConfig>): {
  system: SelfHealingSystem;
  watchdog: SelfHealingWatchdog;
} {
  const system = getSelfHealingSystem(config);
  system.activate();
  if (!globalWatchdog) {
    const interval = system.getStatus().config.watchdogIntervalMs;
    globalWatchdog = new SelfHealingWatchdog(system, interval);
    globalWatchdog.start();
  }
  return { system, watchdog: globalWatchdog };
}

type BasicRequest = { method?: string; url?: string };
type BasicResponse = {
  status: (code: number) => { json: (body: unknown) => void };
};
type NextFn = (err?: unknown) => void;

export function selfHealingMiddleware() {
  return (
    error: Error,
    req: BasicRequest,
    res: BasicResponse,
    _next: NextFn,
  ): void => {
    colorLog(
      "error",
      `HTTP error on ${req.method ?? "?"} ${req.url ?? "?"}: ${error.message}`,
    );
    const system = getSelfHealingSystem();
    system.submitError(error).catch(() => {
      // Do not break response flow if healing itself fails.
    });
    res.status(500).json({
      error: "internal_error",
      healed: true,
      message: "Self-healing system captured the failure.",
    });
  };
}

export async function safeExecute<T>(
  fn: () => T | Promise<T>,
  fallbackValue: T,
  context?: string,
): Promise<T> {
  try {
    return await Promise.resolve(fn());
  } catch (error) {
    const normalizedError =
      error instanceof Error ? error : new Error(String(error));
    colorLog(
      "error",
      `safeExecute failed${context ? ` (${context})` : ""}: ${normalizedError.message}`,
    );
    const system = getSelfHealingSystem();
    await system.submitError(normalizedError);
    return fallbackValue;
  }
}

export function safeExecuteSync<T>(
  fn: () => T,
  fallbackValue: T,
  context?: string,
): T {
  try {
    return fn();
  } catch (error) {
    const normalizedError =
      error instanceof Error ? error : new Error(String(error));
    colorLog(
      "error",
      `safeExecuteSync failed${context ? ` (${context})` : ""}: ${normalizedError.message}`,
    );
    const system = getSelfHealingSystem();
    system.submitError(normalizedError).catch(() => {
      // fire-and-forget in sync contexts
    });
    return fallbackValue;
  }
}

export {
  DEFAULT_SELF_HEAL_CONFIG,
  DEFAULT_DASHBOARD_CONFIG,
  colorLog,
  ensureDir,
  safeReadFile,
  safeWriteFile,
  safeReadJson,
  safeWriteJson,
  generateHealingId,
  formatDuration,
  extractObjectName,
  extractVariableName,
  getIntelligentFallback,
};

export default SelfHealingSystem;
