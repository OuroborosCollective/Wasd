"""Compatibility bootstrap for legacy CI jobs that still install only Pillow."""

from __future__ import annotations

import importlib
import subprocess
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
ROOT = SCRIPTS.parent
REQ = SCRIPTS / "stitch_cv_requirements.txt"

subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet", "-r", str(REQ)])

sys.modules.pop(__name__, None)
removed: list[tuple[int, str]] = []
for index in range(len(sys.path) - 1, -1, -1):
    entry = sys.path[index]
    if not entry:
        candidate = Path.cwd().resolve()
    else:
        try:
            candidate = Path(entry).resolve()
        except OSError:
            continue
    if candidate == ROOT or candidate == SCRIPTS or candidate == SCRIPTS / "__tests__":
        removed.append((index, entry))
        sys.path.pop(index)
try:
    real_cv2 = importlib.import_module(__name__)
finally:
    for index, entry in reversed(removed):
        sys.path.insert(index, entry)

globals().update(real_cv2.__dict__)
sys.modules[__name__] = real_cv2
