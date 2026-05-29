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
ROOT_MANIFEST = ROOT / "package.json"
WORKSPACE_MANIFEST = ROOT / "pnpm-workspace.yaml"
SETTINGS_MARKER = "settings:\n  autoInstallPeers: true\n  excludeLinksFromLockfile: false\n\n"
DEPENDENCY_GROUPS = ("dependencies", "devDependencies", "optionalDependencies")


def load_root_overrides() -> dict[str, str]:
    # Try workspace yaml first (pnpm v11)
    overrides = {}
    if WORKSPACE_MANIFEST.exists():
        text = WORKSPACE_MANIFEST.read_text()
        # Robust multi-line extraction for YAML block
        match = re.search(r"^overrides:\s*\n((?:\s+.*\n?)*?)(?=\n\S|$)", text, re.MULTILINE)
        if match:
            for line in match.group(1).splitlines():
                # Handle optional quotes and trailing comments
                m = re.match(r"^\s+[\"']?([^\"':\s]+)[\"']?:\s*[\"']?([^\"'\s#]+)[\"']?(\s*#.*)?$", line)
                if m:
                    overrides[m.group(1)] = m.group(2)

    # Fallback to package.json (pnpm < 11)
    if not overrides and ROOT_MANIFEST.exists():
        data = json.loads(ROOT_MANIFEST.read_text())
        pnpm_config = data.get("pnpm", {})
        pkg_overrides = pnpm_config.get("overrides", {})
        if isinstance(pkg_overrides, dict):
            overrides.update({str(name): str(version) for name, version in pkg_overrides.items()})

    return overrides


def render_overrides_block(overrides: dict[str, str]) -> str:
    if not overrides:
        return ""
    lines = ["overrides:\n"]
    for name, version in overrides.items():
        key = f"'{name}'" if name.startswith("@") else name
        lines.append(f"  {key}: {yaml_scalar(version)}\n")
    return "".join(lines)


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
    overrides: dict[str, str],
    importer: str,
    group: str,
    dep: str,
) -> str | None:
    manifest_value = manifest_specs.get(importer, {}).get(group, {}).get(dep)
    if manifest_value is None:
        return None
    # pnpm validates importer specifiers after root overrides are applied.
    return overrides.get(dep, manifest_value)


def replace_or_insert_overrides_block(text: str, overrides: dict[str, str]) -> str:
    block = render_overrides_block(overrides)
    if "\noverrides:\n" in text:
        pattern = re.compile(r"\noverrides:\n(?:  .+\n)+", re.MULTILINE)
        return pattern.sub("\n" + block + "\n", text, count=1)
    if SETTINGS_MARKER not in text:
        raise SystemExit("Expected pnpm lockfile settings marker not found")
    return text.replace(SETTINGS_MARKER, SETTINGS_MARKER + block + "\n", 1)


def main() -> None:
    overrides = load_root_overrides()
    text = replace_or_insert_overrides_block(LOCKFILE.read_text(), overrides)

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
            expected = expected_specifier(manifest_specs, overrides, current_importer, current_group, current_dep)
            if expected is not None:
                replacement = f"        specifier: {yaml_scalar(expected)}\n"
                if replacement != line:
                    lines[index] = replacement
                    changed += 1
            continue

    LOCKFILE.write_text("".join(lines))
    print(
        "Docker pnpm lockfile preflight synced "
        f"{changed} importer specifier(s) and {len(overrides)} override(s)."
    )


if __name__ == "__main__":
    main()
