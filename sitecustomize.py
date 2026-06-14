"""Repository-local Python startup hooks.

Only the Stitch asset intake pipeline needs OpenCV/NumPy. Some legacy CI jobs
install Pillow directly in workflow YAML, so this hook bootstraps the declared
Stitch CV requirements before scripts/stitch_atlas_intake.py imports cv2.
"""

from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path


def _is_stitch_invocation() -> bool:
    joined = " ".join(sys.argv)
    return "stitch_atlas_intake.py" in joined or "stitch_atlas_intake.test.py" in joined


def _ensure_stitch_cv_deps() -> None:
    if not _is_stitch_invocation():
        return

    required_specs = {
        "PIL": "Pillow",
        "numpy": "numpy",
        "cv2": "opencv-python-headless",
    }
    missing = [package for module, package in required_specs.items() if importlib.util.find_spec(module) is None]
    if not missing:
        return

    requirements = Path(__file__).resolve().parent / "scripts" / "stitch_cv_requirements.txt"
    command = [sys.executable, "-m", "pip", "install", "--quiet"]
    if requirements.exists():
        command.extend(["-r", str(requirements)])
    else:
        command.extend(missing)
    subprocess.check_call(command)


_ensure_stitch_cv_deps()
