"""Stitch Python startup hook for legacy CI jobs.

This is loaded when running `python3 scripts/stitch_atlas_intake.py` because
`scripts/` is Python's startup path for that invocation.
"""

from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path

required = {
    "PIL": "Pillow",
    "numpy": "numpy",
    "cv2": "opencv-python-headless",
}
missing = [pkg for module, pkg in required.items() if importlib.util.find_spec(module) is None]
if missing:
    requirements = Path(__file__).resolve().parent / "stitch_cv_requirements.txt"
    cmd = [sys.executable, "-m", "pip", "install", "--quiet"]
    cmd.extend(["-r", str(requirements)] if requirements.exists() else missing)
    subprocess.check_call(cmd)
