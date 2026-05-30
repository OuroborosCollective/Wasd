import os
import json

def fix_tsconfig(filepath):
    if not os.path.exists(filepath):
        return
    with open(filepath, 'r') as f:
        content = f.read()

    # Strip comments for JSON parsing
    json_content = re.sub(r'//.*', '', content)
    json_content = re.sub(r'/\*.*?\*/', '', json_content, flags=re.DOTALL)

    try:
        data = json.loads(json_content)
    except Exception as e:
        print(f"Failed to parse {filepath}: {e}")
        return

    # For apps/web/tsconfig.json, we want to make sure it includes the shared packages it needs
    # if it doesn't already. But the error is "Cannot find module @wasd/types" etc.
    # This usually means the paths or references are missing.

    if "compilerOptions" not in data:
        data["compilerOptions"] = {}

    if "paths" not in data["compilerOptions"]:
        data["compilerOptions"]["paths"] = {}

    data["compilerOptions"]["paths"]["@wasd/types"] = ["../../packages/types/src"]
    data["compilerOptions"]["paths"]["@wasd/shared"] = ["../../packages/shared/src"]
    data["compilerOptions"]["baseUrl"] = "."

    if "references" not in data:
        data["references"] = []

    refs = {r["path"] for r in data["references"]}
    for p in ["../../packages/types", "../../packages/shared"]:
        if p not in refs:
            data["references"].append({"path": p})

    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Updated {filepath}")

import re
# Actually, let's just use replace_with_git_merge_diff for safer editing of the specific file
