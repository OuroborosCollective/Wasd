#!/usr/bin/env python3
"""Synchronize pnpm-lock.yaml metadata for Docker frozen installs.

This script intentionally mutates only the Docker build copy of pnpm-lock.yaml.
It is used because the VPS cannot safely run a full `pnpm install --no-frozen-lockfile`
inside Docker without risking OOM kills.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(".")
LOCKFILE = ROOT / "pnpm-lock.yaml"
SETTINGS_MARKER = "settings:\n  autoInstallPeers: true\n  excludeLinksFromLockfile: false\n\n"
OVERRIDES = {
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@types/node": "^25.7.0",
    "zod": "^4.4.3",
    "three": "0.184.0",
    "@babylonjs/core": "^9.6.2",
    "@babylonjs/materials": "^9.6.2",
    "@babylonjs/loaders": "^9.6.2",
    "react": "^19.2.6",
    "socket.io-client": "^4.8.3",
    "pg": "^8.20.0",
}
OVERRIDES_BLOCK = "overrides:\n" + "".join(
    f"  '{name}': {version}\n" if name.startswith("@") else f"  {name}: {version}\n"
    for name, version in OVERRIDES.items()
)
DEPENDENCY_GROUPS = ("dependencies", "devDependencies", "optionalDependencies")


def unquote_yaml_key(raw: str) -> str:
    raw = raw.strip()
    if len(raw) >= 2 and raw[0] == "'" and raw[-1] == "'":
        return raw[1:-1].replace("''", "'")
    if len(raw) >= 2 and raw[0] == '"' and raw[-1] == '"':
        return raw[1:-1]
    return raw


def yaml_scalar(value: str) -> str:
    lowered = value.lower()
    if (
        value == ""
        or value == "*"
        or lowered in {"null", "true", "false", "yes", "no", "on", "off"}
        or re.fullmatch(r"[0-9]+", value)
    ):
        return "'" + value.replace("'", "''") + "'"
    return value


def string_deps(value: object) -> dict[str, str]:
    if not isinstance(value, dict):
        return {}
    return {str(k): str(v) for k, v in value.items()}


def load_manifest_specs() -> dict[str, dict[str, dict[str, str]]]:
    specs: dict[str, dict[str, dict[str, str]]] = {}
    for manifest in sorted(ROOT.rglob("package.json")):
        if "node_modules" in manifest.parts:
            continue
        importer = "." if manifest.parent == ROOT else manifest.parent.as_posix()
        data = json.loads(manifest.read_text())

        dependencies = string_deps(data.get("dependencies"))
        # pnpm stores peerDependencies in importer dependency specifiers for
        # frozen-lockfile validation, so merge them into the dependency bucket.
        dependencies.update(string_deps(data.get("peerDependencies")))

        importer_specs: dict[str, dict[str, str]] = {
            "dependencies": dependencies,
            "devDependencies": string_deps(data.get("devDependencies")),
            "optionalDependencies": string_deps(data.get("optionalDependencies")),
        }
        specs[importer] = importer_specs
    return specs


def expected_specifier(
    manifest_specs: dict[str, dict[str, dict[str, str]]],
    importer: str,
    group: str,
    dep: str,
) -> str | None:
    manifest_value = manifest_specs.get(importer, {}).get(group, {}).get(dep)
    if manifest_value is None:
        return None
    # pnpm validates importer specifiers after root overrides are applied.
    return OVERRIDES.get(dep, manifest_value)


def main() -> None:
    text = LOCKFILE.read_text()
    if "\noverrides:\n" not in text:
        if SETTINGS_MARKER not in text:
            raise SystemExit("Expected pnpm lockfile settings marker not found")
        text = text.replace(SETTINGS_MARKER, SETTINGS_MARKER + OVERRIDES_BLOCK + "\n", 1)

    manifest_specs = load_manifest_specs()
    lines = text.splitlines(keepends=True)
    in_importers = False
    current_importer: str | None = None
    current_group: str | None = None
    current_dep: str | None = None
    changed = 0

    for index, line in enumerate(lines):
        stripped = line.strip()
        indent = len(line) - len(line.lstrip(" "))

        if line == "importers:\n":
            in_importers = True
            current_importer = current_group = current_dep = None
            continue

        if in_importers and indent == 0 and stripped.endswith(":") and stripped != "importers:":
            in_importers = False
            current_importer = current_group = current_dep = None
            continue

        if not in_importers or not stripped:
            continue

        if indent == 2 and stripped.endswith(":"):
            current_importer = unquote_yaml_key(stripped[:-1])
            current_group = current_dep = None
            continue

        if indent == 4 and stripped.endswith(":") and stripped[:-1] in DEPENDENCY_GROUPS:
            current_group = stripped[:-1]
            current_dep = None
            continue

        if indent == 6 and stripped.endswith(":"):
            current_dep = unquote_yaml_key(stripped[:-1])
            continue

        if indent == 8 and stripped.startswith("specifier:") and current_importer and current_group and current_dep:
            expected = expected_specifier(manifest_specs, current_importer, current_group, current_dep)
            if expected is not None:
                replacement = f"        specifier: {yaml_scalar(expected)}\n"
                if replacement != line:
                    lines[index] = replacement
                    changed += 1
            continue

    LOCKFILE.write_text("".join(lines))
    print(f"Docker pnpm lockfile preflight synced {changed} importer specifier(s).")


if __name__ == "__main__":
    main()
