#!/usr/bin/env python3
"""
Unpack the prepared Pipoya 2D character atlas asset drop.

Source ZIP:
  asset-packs/2d/pipoya-character-atlas-drop.zip

Expected output:
  apps/client-2d/public/2d-assets/characters/pipoya/pipoya-character-atlas.png
  apps/client-2d/public/2d-assets/characters/pipoya/pipoya-character-atlas.json
  docs/PIPOYA_CHARACTER_ATLAS_DROP.md

Standard library only. No package or lockfile changes.
"""

from __future__ import annotations

import argparse
import zipfile
from pathlib import Path

DEFAULT_ZIP = Path("asset-packs/2d/pipoya-character-atlas-drop.zip")
ALLOWED_PREFIXES = (
    "apps/client-2d/public/2d-assets/characters/pipoya/",
    "docs/PIPOYA_CHARACTER_ATLAS_DROP.md",
)
EXPECTED_FILES = (
    "apps/client-2d/public/2d-assets/characters/pipoya/pipoya-character-atlas.png",
    "apps/client-2d/public/2d-assets/characters/pipoya/pipoya-character-atlas.json",
    "docs/PIPOYA_CHARACTER_ATLAS_DROP.md",
)


def is_allowed(name: str) -> bool:
    normalized = name.replace("\\", "/").lstrip("/")
    if ".." in Path(normalized).parts:
        return False
    return any(normalized == prefix or normalized.startswith(prefix) for prefix in ALLOWED_PREFIXES)


def unpack(zip_path: Path, repo_root: Path) -> list[str]:
    if not zip_path.exists():
        raise SystemExit(f"Asset pack not found: {zip_path}")

    written: list[str] = []
    with zipfile.ZipFile(zip_path) as archive:
        names = archive.namelist()
        blocked = [name for name in names if name and not name.endswith("/") and not is_allowed(name)]
        if blocked:
            preview = "\n".join(f"  - {name}" for name in blocked[:20])
            raise SystemExit(f"Refusing to unpack unexpected paths:\n{preview}")

        for name in names:
            if not name or name.endswith("/"):
                continue
            target = repo_root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(archive.read(name))
            written.append(name)

    missing = [path for path in EXPECTED_FILES if not (repo_root / path).exists()]
    if missing:
        preview = "\n".join(f"  - {path}" for path in missing)
        raise SystemExit(f"Unpack incomplete. Missing expected files:\n{preview}")

    return written


def main() -> int:
    parser = argparse.ArgumentParser(description="Unpack the prepared Pipoya character atlas asset pack.")
    parser.add_argument("zip_path", nargs="?", default=str(DEFAULT_ZIP), help="Path to pipoya-character-atlas-drop.zip")
    args = parser.parse_args()

    written = unpack(Path(args.zip_path), Path.cwd())
    print("Pipoya character atlas unpacked")
    print(f"files: {len(written)}")
    for path in written:
        print(f"- {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
