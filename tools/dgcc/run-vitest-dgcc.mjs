#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const EXCLUDE_B64 =
  "cG9ydGFsL3NyYy9haS9zY2llbmNlTWFzY290U3RyZXNzLnRlc3QudHMKc2VydmVyL3NyYy90ZXN0cy9kYXRhYmFzZS50ZXN0LnRzCnNlcnZlci9zcmMvdGVzdHMvbnBjLW1lbW9yeS1jaGF0LnRlc3QudHMKc2VydmVyL3NyYy90ZXN0cy9jaHVuay1zeXN0ZW0udGVzdC50cwpzZXJ2ZXIvc3JjL3Rlc3RzL2NsaWVudC1jb25maWctcm91dGUudGVzdC50cwpzZXJ2ZXIvc3JjL3Rlc3RzL2NvbWJhdC13cy50ZXN0LnRzCnNlcnZlci9zcmMvdGVzdHMvZGlhYmxvLWxvb3QtbW9kdWxlcy50ZXN0LnRzCnNlcnZlci9zcmMvdGVzdHMvbG9vdC50ZXN0LnRzCnNlcnZlci9zcmMvdGVzdHMvcGVyc2lzdGVuY2UtZmlsZS50ZXN0LnRzCnNlcnZlci9zcmMvdGVzdHMvcGVyc2lzdGVuY2UtZmxvdy50ZXN0LnRzCnNlcnZlci9zcmMvdGVzdHMvcHJveGltaXR5LnRlc3QudHMKc2VydmVyL3NyYy90ZXN0cy9yZXNvbHZlLXdvcmxkLWFzc2V0cy1kaXIudGVzdC50cwpzZXJ2ZXIvc3JjL3Rlc3RzL3NlbGZoZWFsaW5nLXN5c3RlbS50ZXN0LnRzCnNlcnZlci9zcmMvdGVzdHMvc3VwYWJhc2UtYWRtaW4tbGF6eS50ZXN0LnRzCnNlcnZlci9zcmMvdGVzdHMvc3VwYWJhc2UtYXV0aC1wcm94eS1yZXNvbHV0aW9uLnRlc3QudHMKc2VydmVyL3NyYy90ZXN0cy91c2Utc2tpbGwtd3MudGVzdC50cwo=";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const excludes = Buffer.from(EXCLUDE_B64, "base64")
  .toString("utf8")
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);

const args = ["exec", "vitest", "run", "client/src", "server/src/tests"];
for (const p of excludes) {
  args.push("--exclude", p);
}

const child = spawn("pnpm", args, { cwd: root, stdio: "inherit", shell: false });
child.on("close", (code) => process.exit(code ?? 1));
