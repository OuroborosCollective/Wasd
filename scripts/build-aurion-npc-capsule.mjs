import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = "server/src/aurion/npc";
const workspaceInputs = ["package.json","server/package.json","pnpm-workspace.yaml"];
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const canonical = value => JSON.stringify(value, (_key, child) => child && typeof child === "object" && !Array.isArray(child)
  ? Object.fromEntries(Object.entries(child).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0)) : child);
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

/** Build actual WASD code and its exact validation dependency, not a host-side rewrite. */
export async function buildNpcCapsule(output, { allowDirty = false } = {}) {
  const out = path.resolve(output);
  if (out === root || out.startsWith(path.join(root, "server")) || out.startsWith(path.join(root, "scripts"))) throw Error("NPC_CAPSULE_OUTPUT_BOUNDARY");
  const revision = git("rev-parse", "HEAD");
  const dirty = git("status", "--porcelain", "--", sourceDirectory, "scripts/build-aurion-npc-capsule.mjs", "server/tsconfig.aurion-npc.json", "pnpm-lock.yaml", ...workspaceInputs);
  if (dirty && !allowDirty) throw Error("NPC_CAPSULE_COMMITTED_SOURCE_REQUIRED");
  const paths = (await readdir(path.join(root, sourceDirectory))).filter(name => name.endsWith(".ts")).sort().map(name => `${sourceDirectory}/${name}`);
  const sourceFiles = Object.fromEntries(await Promise.all(paths.map(async name => [name, hash(await readFile(path.join(root,name)))])));
  const sourceSha256 = hash(canonical(sourceFiles));
  const requireServer = createRequire(path.join(root,"server/package.json"));
  const requireTsx = createRequire(requireServer.resolve("tsx/package.json"));
  const esbuild = requireTsx("esbuild");
  const typescript = requireServer("typescript");
  const zodVersion = requireServer("zod/package.json").version;
  if (esbuild.version !== "0.28.2" || typescript.version !== "5.9.3" || zodVersion !== "4.5.4") throw Error("NPC_CAPSULE_TOOLCHAIN_VERSION");
  await mkdir(out, { recursive: true });
  if ((await readdir(out)).length) throw Error("NPC_CAPSULE_EMPTY_OUTPUT_REQUIRED");
  await esbuild.build({ absWorkingDir: root, entryPoints: [`${sourceDirectory}/index.ts`], outfile: path.join(out,"index.js"),
    bundle: true, format: "esm", platform: "node", target: "node22", sourcemap: false, legalComments: "eof", charset: "utf8",
    define: { __WASD_NPC_SOURCE_REVISION__: JSON.stringify(revision), __WASD_NPC_SOURCE_SHA256__: JSON.stringify(sourceSha256) },
    banner: { js: "// Generated from verified WASD source. Edit WASD source and rebuild; never edit this artifact." },
  });
  execFileSync(process.execPath, [requireServer.resolve("typescript/bin/tsc"), "-p", "server/tsconfig.aurion-npc.json", "--outDir", out], { cwd: root, stdio: "inherit" });
  await writeFile(path.join(out,"LICENSE.zod"), await readFile(path.join(path.dirname(requireServer.resolve("zod/package.json")),"LICENSE")));
  await writeFile(path.join(out,"package.json"), '{"type":"module","private":true}\n');
  const files = Object.fromEntries(await Promise.all((await readdir(out)).sort().map(async name => [name, hash(await readFile(path.join(out,name)))])));
  const payload = { schemaVersion: "wasd-aurion-npc-capsule.v1", authority: "OuroborosCollective/Wasd", sourceRevision: revision,
    sourceSha256, sourceFiles, sourceState: dirty ? "UNCOMMITTED_LOCAL_CANDIDATE" : "COMMITTED", files,
    workspaceFiles: Object.fromEntries(await Promise.all(workspaceInputs.map(async name=>[name,hash(await readFile(path.join(root,name)))]))),
    toolchain: { esbuild: esbuild.version, typescript: typescript.version, zod: zodVersion, nodeTarget: "node22", lockSha256: hash(await readFile(path.join(root,"pnpm-lock.yaml"))),
      builderSha256: hash(await readFile(fileURLToPath(import.meta.url))), declarationConfigSha256: hash(await readFile(path.join(root,"server/tsconfig.aurion-npc.json"))) },
  };
  const manifest = { ...payload, manifestSha256: hash(canonical(payload)) };
  await writeFile(path.join(out,"manifest.json"), canonical(manifest)+"\n");
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [out, ...options] = process.argv.slice(2);
  if (!out || options.some(option => option !== "--local-candidate")) throw Error("USAGE: build-aurion-npc-capsule.mjs OUTPUT [--local-candidate]");
  const manifest = await buildNpcCapsule(out, { allowDirty: options.includes("--local-candidate") });
  console.log(JSON.stringify({ status: manifest.sourceState, sourceRevision: manifest.sourceRevision, sourceSha256: manifest.sourceSha256, manifestSha256: manifest.manifestSha256, fileCount: Object.keys(manifest.files).length }));
}
