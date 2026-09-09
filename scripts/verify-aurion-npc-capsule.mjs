import { readFile, readdir, lstat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";

const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const canonical = value => JSON.stringify(value, (_key, child) => child && typeof child === "object" && !Array.isArray(child)
  ? Object.fromEntries(Object.entries(child).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0)) : child);
const hashPattern = /^[a-f0-9]{64}$/;
const modules = ["actionGateway","authority","ax1LivingWorldProtocol","canonical","index","merchantRules","multiMemory","npcLifeProtocol","npcNeeds","npcPersistenceProtocol","worldPolityRules"];
const sourceNames = modules.map(name=>`server/src/aurion/npc/${name}.ts`).sort();
const outputNames = ["index.js","LICENSE.zod","package.json",...modules.map(name=>`${name}.d.ts`)].sort();
function exactKeys(value, names) {
  return value && typeof value === "object" && !Array.isArray(value) && canonical(Object.keys(value).sort()) === canonical([...names].sort());
}

/** Verify bytes before importing code. Expected identities come from the reviewed consumer pin. */
export async function verifyNpcCapsule(directory, expected) {
  if (!/^[a-f0-9]{40}$/.test(expected?.sourceRevision ?? "") || !hashPattern.test(expected?.manifestSha256 ?? "")) throw Error("NPC_CAPSULE_EXPECTED_IDENTITY_REQUIRED");
  const root = path.resolve(directory);
  const entries = await readdir(root);
  if (canonical(entries.sort()) !== canonical([...outputNames,"manifest.json"].sort())) throw Error("NPC_CAPSULE_FILE_SET_INVALID");
  for (const name of entries) if (!(await lstat(path.join(root,name))).isFile()) throw Error("NPC_CAPSULE_REGULAR_FILES_REQUIRED");
  const manifest = JSON.parse(await readFile(path.join(root,"manifest.json"),"utf8"));
  if (!exactKeys(manifest,["schemaVersion","authority","sourceRevision","sourceSha256","sourceFiles","sourceState","files","workspaceFiles","toolchain","manifestSha256"]) ||
      manifest.schemaVersion !== "wasd-aurion-npc-capsule.v1" || manifest.authority !== "OuroborosCollective/Wasd" ||
      manifest.sourceRevision !== expected.sourceRevision || manifest.sourceState !== (expected.localCandidate === true ? "UNCOMMITTED_LOCAL_CANDIDATE" : "COMMITTED")) throw Error("NPC_CAPSULE_SOURCE_IDENTITY_INVALID");
  const {manifestSha256,...unsigned} = manifest;
  if (manifestSha256 !== expected.manifestSha256 || manifestSha256 !== hash(canonical(unsigned))) throw Error("NPC_CAPSULE_MANIFEST_HASH_INVALID");
  if (!exactKeys(manifest.sourceFiles,sourceNames) || !Object.values(manifest.sourceFiles).every(v=>hashPattern.test(v)) || manifest.sourceSha256 !== hash(canonical(manifest.sourceFiles))) throw Error("NPC_CAPSULE_SOURCE_HASH_INVALID");
  if (!exactKeys(manifest.workspaceFiles,["package.json","server/package.json","pnpm-workspace.yaml"]) || !Object.values(manifest.workspaceFiles).every(v=>hashPattern.test(v))) throw Error("NPC_CAPSULE_WORKSPACE_HASH_INVALID");
  const tc = manifest.toolchain;
  if (!exactKeys(tc,["esbuild","typescript","zod","nodeTarget","lockSha256","builderSha256","declarationConfigSha256"]) ||
      tc.esbuild !== "0.28.2" || tc.typescript !== "5.9.3" || tc.zod !== "4.5.4" || tc.nodeTarget !== "node22" ||
      ![tc.lockSha256,tc.builderSha256,tc.declarationConfigSha256].every(v=>hashPattern.test(v))) throw Error("NPC_CAPSULE_TOOLCHAIN_INVALID");
  if (!exactKeys(manifest.files,outputNames) || !Object.values(manifest.files).every(v=>hashPattern.test(v))) throw Error("NPC_CAPSULE_FILE_SET_INVALID");
  for (const name of outputNames) if (hash(await readFile(path.join(root,name))) !== manifest.files[name]) throw Error(`NPC_CAPSULE_FILE_HASH_INVALID:${name}`);
  return Object.freeze({status:"VERIFIED",sourceRevision:manifest.sourceRevision,sourceSha256:manifest.sourceSha256,manifestSha256,fileCount:outputNames.length});
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [directory,sourceRevision,manifestSha256,...extra] = process.argv.slice(2);
  if (!directory || extra.length) throw Error("USAGE: verify-aurion-npc-capsule.mjs DIRECTORY EXPECTED_SOURCE_REVISION EXPECTED_MANIFEST_SHA256");
  console.log(JSON.stringify(await verifyNpcCapsule(directory,{sourceRevision,manifestSha256})));
}
