import fs from "node:fs/promises";
import path from "node:path";
import { genkitAuthoringRuntime } from "../ai/genkit/GenkitAuthoringRuntime.js";
import { findRepoRootWithGameData } from "../modules/content/repoRoot.js";

interface CliArgs {
  kind: "status" | "quest" | "poi";
  requestId: string;
  authorId: string;
  brief: string;
  tick: number | null;
  sourceRefs: string[];
  constraints: string[];
  write: boolean;
}

function readArg(name: string): string | null {
  const prefix = `--${name}=`;
  const value = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`);
}

function listArg(name: string): string[] {
  const value = readArg(name);
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function parseArgs(): CliArgs {
  const rawKind = (readArg("kind") ?? "status").trim();
  const kind = rawKind === "quest" || rawKind === "poi" ? rawKind : "status";
  const tickRaw = readArg("tick");
  const tickNumber = tickRaw === null ? null : Number(tickRaw);

  return {
    kind,
    requestId: readArg("request-id")?.trim() ?? "",
    authorId: readArg("author-id")?.trim() ?? "",
    brief: readArg("brief")?.trim() ?? "",
    tick: tickNumber !== null && Number.isInteger(tickNumber) && tickNumber >= 0 ? tickNumber : null,
    sourceRefs: listArg("source-refs"),
    constraints: listArg("constraints"),
    write: hasFlag("write"),
  };
}

async function writeCompiled(targetPath: string, canonicalJson: string): Promise<string> {
  const repositoryRoot = findRepoRootWithGameData();
  if (!repositoryRoot) throw new Error("AUTHORING_REPOSITORY_ROOT_NOT_FOUND");

  const absoluteTarget = path.resolve(repositoryRoot, targetPath);
  const relative = path.relative(repositoryRoot, absoluteTarget);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("AUTHORING_TARGET_OUTSIDE_REPOSITORY");
  }
  if (!relative.startsWith(`game-data${path.sep}`)) {
    throw new Error("AUTHORING_TARGET_OUTSIDE_GAME_DATA");
  }

  await fs.mkdir(path.dirname(absoluteTarget), { recursive: true });
  // Never overwrite authored content implicitly. Replacement must use the
  // hash-bound Studio write path with an explicit expected SHA-256.
  await fs.writeFile(absoluteTarget, canonicalJson, { encoding: "utf8", flag: "wx" });
  return relative.split(path.sep).join("/");
}

async function main(): Promise<void> {
  const args = parseArgs();
  const status = genkitAuthoringRuntime.getStatus();

  if (args.kind === "status") {
    process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
    return;
  }

  if (!status.available) {
    process.stderr.write(`${JSON.stringify(status, null, 2)}\n`);
    process.exitCode = 2;
    return;
  }

  if (!args.requestId || !args.authorId || args.brief.length < 8) {
    throw new Error("AUTHORING_ARGS_REQUIRED: --request-id, --author-id and --brief are mandatory");
  }

  const request = {
    requestId: args.requestId,
    authorId: args.authorId,
    brief: args.brief,
    canonicalTickContext: args.tick,
    sourceRefs: args.sourceRefs,
    constraints: args.constraints,
  };

  const compiled = args.kind === "quest"
    ? await genkitAuthoringRuntime.proposeQuest(request)
    : await genkitAuthoringRuntime.proposeWorldPoi(request);

  let writtenPath: string | null = null;
  if (args.write) {
    writtenPath = await writeCompiled(compiled.targetPath, compiled.canonicalJson);
  }

  process.stdout.write(`${JSON.stringify({
    ok: true,
    authority: "authoring_side_channel",
    kind: compiled.proposal.kind,
    id: compiled.proposal.id,
    proposalHash: compiled.proposalHash,
    targetPath: compiled.targetPath,
    writtenPath,
    canonicalJson: args.write ? undefined : compiled.canonicalJson,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2)}\n`);
  process.exitCode = 1;
});