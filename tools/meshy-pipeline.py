#!/usr/bin/env python3
"""
Meshy.ai asset generation pipeline for Areloria/Wasd MMORPG.
Generates missing/broken GLB models with full rigging + animation.
"""
import requests
import json
import time
import os
import sys

API_KEY = os.environ.get("MESHY_API_KEY")
if not API_KEY:
    print("ERROR: MESHY_API_KEY environment variable is not set.")
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}
BASE = "https://api.meshy.ai/openapi"
PROJECT_ROOT = "/opt/data/projects/Wasd"

def check_balance():
    r = requests.get(f"{BASE}/v1/balance", headers=HEADERS)
    return r.json().get("balance", 0)

def create_text_to_3d(prompt, mode="preview", model_type="standard", 
                       target_polycount=15000, pose_mode="t-pose",
                       target_formats=None):
    """Create a text-to-3d task (preview or refine)."""
    body = {
        "mode": mode,
        "prompt": prompt,
        "model_type": model_type,
        "target_polycount": target_polycount,
    }
    if mode == "preview":
        body["pose_mode"] = pose_mode
    if target_formats:
        body["target_formats"] = target_formats
    
    r = requests.post(f"{BASE}/v2/text-to-3d", headers=HEADERS, json=body)
    if r.status_code != 200:
        print(f"  ERROR: {r.status_code} {r.text[:200]}")
        return None
    return r.json().get("result")

def refine_text_to_3d(preview_task_id, texture_prompt=None):
    """Refine a preview task to add texture."""
    body = {
        "mode": "refine",
        "preview_task_id": preview_task_id,
        "enable_pbr": False,
        "remove_lighting": True,
    }
    if texture_prompt:
        body["texture_prompt"] = texture_prompt
    
    r = requests.post(f"{BASE}/v2/text-to-3d", headers=HEADERS, json=body)
    if r.status_code != 200:
        print(f"  REFINE ERROR: {r.status_code} {r.text[:200]}")
        return None
    return r.json().get("result")

def create_rigging_task(input_task_id=None, model_url=None, height_meters=1.5):
    """Create a rigging task for a model."""
    body = {"height_meters": height_meters}
    if input_task_id:
        body["input_task_id"] = input_task_id
    elif model_url:
        body["model_url"] = model_url
    
    r = requests.post(f"{BASE}/v1/rigging", headers=HEADERS, json=body)
    if r.status_code != 200:
        print(f"  RIGGING ERROR: {r.status_code} {r.text[:200]}")
        return None
    return r.json().get("result")

def create_animation_task(rig_task_id, action_id):
    """Create an animation task for a rigged model."""
    body = {
        "rig_task_id": rig_task_id,
        "action_id": action_id,
    }
    r = requests.post(f"{BASE}/v1/animations", headers=HEADERS, json=body)
    if r.status_code != 200:
        print(f"  ANIMATION ERROR: {r.status_code} {r.text[:200]}")
        return None
    return r.json().get("result")

def get_task(task_id, endpoint="text-to-3d"):
    """Get task status."""
    r = requests.get(f"{BASE}/v2/{endpoint}/{task_id}", headers=HEADERS)
    if r.status_code != 200:
        # Try v1 for rigging/animation
        r = requests.get(f"{BASE}/v1/{endpoint}/{task_id}", headers=HEADERS)
    if r.status_code != 200:
        return {"status": "ERROR", "error": r.text[:200]}
    return r.json()

def wait_for_task(task_id, endpoint="text-to-3d", max_wait=300, poll_interval=10):
    """Wait for a task to complete."""
    start = time.time()
    while time.time() - start < max_wait:
        task = get_task(task_id, endpoint)
        status = task.get("status", "UNKNOWN")
        progress = task.get("progress", 0)
        
        if status == "SUCCEEDED":
            print(f"    ✓ {task_id[:12]}... SUCCEEDED")
            return task
        elif status in ("FAILED", "CANCELED"):
            error = task.get("task_error", {}).get("message", "unknown")
            print(f"    ✗ {task_id[:12]}... {status}: {error}")
            return task
        else:
            print(f"    ⟳ {task_id[:12]}... {status} {progress}%")
        
        time.sleep(poll_interval)
    
    print(f"    ⏰ {task_id[:12]}... TIMEOUT after {max_wait}s")
    return {"status": "TIMEOUT"}

def download_file(url, filepath):
    """Download a file from URL."""
    r = requests.get(url, stream=True)
    if r.status_code == 200:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        size = os.path.getsize(filepath)
        print(f"    ↓ Downloaded {os.path.basename(filepath)} ({size:,} bytes)")
        return True
    else:
        print(f"    ✗ Download failed: {r.status_code}")
        return False

# ============================================
# ASSET GENERATION PIPELINE
# ============================================

assets_to_generate = [
    {
        "name": "portal_obsidian",
        "description": "A dark obsidian portal frame with swirling purple energy vortex in the center, "
                       "ancient runic carvings on the stone pillars, ominous magical glow, "
                       "fantasy RPG game asset, low-poly stylized, dark fantasy aesthetic",
        "output_path": "client/public/assets/models/kaykit/dungeon/portal.gltf",
        "needs_rigging": False,
        "needs_animation": False,
        "polycount": 8000,
    },
    {
        "name": "goblin_warrior",
        "description": "A goblin warrior creature for a fantasy RPG game. Small green-skinned humanoid "
                       "with pointed ears, sharp teeth, hunched posture, wearing crude leather armor "
                       "with metal studs, carrying a rusty shortsword. Low-poly game-ready model, "
                       "stylized cartoon proportions, T-pose",
        "output_path": "client/public/assets/models/monsters/goblin.glb",
        "needs_rigging": True,
        "needs_animation": True,
        "polycount": 12000,
        "height": 1.2,
    },
]

if __name__ == "__main__":
    balance = check_balance()
    print(f"Meshy balance: {balance} credits")
    print(f"Assets to generate: {len(assets_to_generate)}")
    print()
    
    for asset in assets_to_generate:
        print(f"=== {asset['name']} ===")
        print(f"  Prompt: {asset['description'][:80]}...")
        
        # Step 1: Preview
        print("  [1/6] Creating preview task...")
        preview_id = create_text_to_3d(
            prompt=asset["description"],
            mode="preview",
            target_polycount=asset["polycount"],
            target_formats=["glb"],
        )
        if not preview_id:
            print("  FAILED to create preview task")
            continue
        print(f"  Preview ID: {preview_id}")
        
        # Wait for preview
        preview_result = wait_for_task(preview_id, "text-to-3d")
        if preview_result.get("status") != "SUCCEEDED":
            print("  Preview FAILED, skipping...")
            continue
        
        # Step 2: Refine (add texture)
        print("  [2/6] Refining with texture...")
        refine_id = refine_text_to_3d(preview_id)
        if not refine_id:
            print("  FAILED to create refine task")
            continue
        print(f"  Refine ID: {refine_id}")
        
        # Wait for refine
        refine_result = wait_for_task(refine_id, "text-to-3d")
        if refine_result.get("status") != "SUCCEEDED":
            print("  Refine FAILED, skipping...")
            continue
        
        # Get the textured GLB URL
        model_urls = refine_result.get("result", {})
        glb_url = model_urls.get("model_urls", {}).get("glb") or model_urls.get("glb_url")
        if not glb_url:
            # Try from the task result directly
            print(f"  Result keys: {list(model_urls.keys())}")
            # Check for nested model_urls
            for key in model_urls:
                val = model_urls[key]
                if isinstance(val, str) and "glb" in val.lower():
                    glb_url = val
                    break
                elif isinstance(val, dict):
                    for k2, v2 in val.items():
                        if isinstance(v2, str) and "glb" in v2.lower():
                            glb_url = v2
                            break
        
        if not glb_url:
            print(f"  WARNING: No GLB URL found in result. Full result: {json.dumps(model_urls, indent=2)[:500]}")
            # Download the base model from preview instead
            preview_urls = preview_result.get("result", {})
            glb_url = preview_urls.get("model_urls", {}).get("glb")
        
        if not glb_url:
            print("  FAILED to get GLB URL")
            continue
        
        print(f"  GLB URL: {glb_url[:80]}...")
        
        # Save untextured/unfinished model first
        temp_path = os.path.join(PROJECT_ROOT, f".meshy-temp/{asset['name']}_textured.glb")
        download_file(glb_url, temp_path)
        
        if asset["needs_rigging"]:
            # Step 3: Rigging
            print("  [3/6] Rigging model...")
            rig_id = create_rigging_task(
                input_task_id=refine_id,
                height_meters=asset.get("height", 1.7)
            )
            if not rig_id:
                print("  FAILED to create rigging task, saving textured model as-is")
                download_file(glb_url, os.path.join(PROJECT_ROOT, asset["output_path"]))
                continue
            print(f"  Rig ID: {rig_id}")
            
            # Wait for rigging
            rig_result = wait_for_task(rig_id, "rigging")
            if rig_result.get("status") != "SUCCEEDED":
                print("  Rigging FAILED, saving textured model as-is")
                download_file(glb_url, os.path.join(PROJECT_ROOT, asset["output_path"]))
                continue
            
            # Get rigged GLB URL
            rig_urls = rig_result.get("result", {})
            rigged_glb = rig_urls.get("rigged_character_glb_url")
            if rigged_glb:
                print(f"  Rigged GLB: {rigged_glb[:80]}...")
                download_file(rigged_glb, os.path.join(PROJECT_ROOT, asset["output_path"]))
            else:
                print("  No rigged GLB URL, saving textured model")
                download_file(glb_url, os.path.join(PROJECT_ROOT, asset["output_path"]))
            
            # Save walking/running animations from rigging
            basic_anims = rig_urls.get("basic_animations", {})
            for anim_name in ["walking", "running"]:
                anim_url = basic_anims.get(f"{anim_name}_glb_url")
                if anim_url:
                    anim_path = os.path.join(PROJECT_ROOT, 
                        f"client/public/assets/models/monsters/animations/{asset['name']}_{anim_name}.glb")
                    download_file(anim_url, anim_path)
            
            if asset["needs_animation"]:
                # Step 4-6: Additional animations (idle, attack, die)
                # We'll use common action IDs - these are typical Meshy animation IDs
                # Idle=92, Attack=11, Die=26 (commonly used IDs)
                animations = [
                    ("idle", 92),
                    ("attack_slash", 11),
                    ("die", 26),
                ]
                for i, (anim_name, action_id) in enumerate(animations, 4):
                    print(f"  [{i}/6] Creating {anim_name} animation (action {action_id})...")
                    anim_task_id = create_animation_task(rig_id, action_id)
                    if not anim_task_id:
                        print(f"    FAILED to create {anim_name} task")
                        continue
                    
                    anim_result = wait_for_task(anim_task_id, "animations")
                    if anim_result.get("status") == "SUCCEEDED":
                        anim_url = anim_result.get("result", {}).get("animation_glb_url")
                        if anim_url:
                            anim_path = os.path.join(PROJECT_ROOT,
                                f"client/public/assets/models/monsters/animations/{asset['name']}_{anim_name}.glb")
                            download_file(anim_url, anim_path)
        else:
            # Static model - just download
            output = os.path.join(PROJECT_ROOT, asset["output_path"])
            download_file(glb_url, output)
        
        print()
    
    # Final balance
    final_balance = check_balance()
    print(f"Final balance: {final_balance} credits (used {balance - final_balance})")
