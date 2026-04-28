import sys

def run():
    with open('deploy/sync-supabase-env.sh', 'r') as f:
        content = f.read()

    if 'set_key "VITE_AUTH_PROVIDER" "${VITE_AUTH_PROVIDER:-}"' not in content:
        content = content.replace(
            'set_key "VITE_SUPABASE_URL" "${VITE_SUPABASE_URL:-}"',
            'set_key "VITE_AUTH_PROVIDER" "${VITE_AUTH_PROVIDER:-}"\nset_key "VITE_SUPABASE_URL" "${VITE_SUPABASE_URL:-}"'
        )

    if 'set_key "VITE_BABYLON_PLAYGROUND_TEXTURES_BASE" "${VITE_BABYLON_PLAYGROUND_TEXTURES_BASE:-}"' not in content:
        content = content.replace(
            'set_key "VITE_SUPABASE_ANON_KEY" "${VITE_SUPABASE_ANON_KEY:-}"',
            'set_key "VITE_SUPABASE_ANON_KEY" "${VITE_SUPABASE_ANON_KEY:-}"\nset_key "VITE_BABYLON_PLAYGROUND_TEXTURES_BASE" "${VITE_BABYLON_PLAYGROUND_TEXTURES_BASE:-}"'
        )

    with open('deploy/sync-supabase-env.sh', 'w') as f:
        f.write(content)
    print("Updated deploy/sync-supabase-env.sh")

run()
