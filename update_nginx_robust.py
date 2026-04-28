import sys
import re

def run():
    with open('.github/workflows/deploy.yml', 'r') as f:
        content = f.read()

    # Find the python3 << 'PYEOF' block for Nginx
    pattern = r"(            python3 << 'PYEOF'\n)(.*?)(            PYEOF)"

    # Pre-define the script content to avoid f-string hell
    script_lines = [
        "            import re, os, sys",
        "            conf = \"/etc/nginx/sites-enabled/arelogic.space\"",
        "            if not os.path.exists(conf):",
        "                conf = \"/etc/nginx/sites-enabled/default\"",
        "            if not os.path.exists(conf):",
        "                print(\"Nginx config not found\")",
        "                sys.exit(0)",
        "            with open(conf) as f:",
        "                config = f.read()",
        "            # Robust removal of existing wasm blocks",
        "            config = re.sub(r'\\n\\s*#.*?wasm.*?location ~\\* \\\\.wasm\\$ \\{.*?\\}\\n', '\\n', config, flags=re.DOTALL | re.IGNORECASE)",
        "            config = re.sub(r'location ~\\* \\\\.wasm\\$ \\{.*?\\}', '', config, flags=re.DOTALL)",
        "            wasm = (",
        "                '\\n    # WASM MIME type (critical for Havok physics)\\n'",
        "                '    location ~* \\\\.wasm$ {\\n'",
        "                '        root /opt/areloria/client/dist;\\n'",
        "                '        default_type application/wasm;\\n'",
        "                '        add_header Cross-Origin-Opener-Policy same-origin;\\n'",
        "                '        add_header Cross-Origin-Embedder-Policy require-corp;\\n'",
        "                '        add_header Cache-Control \"public, max-age=31536000, immutable\";\\n'",
        "                '        try_files $uri =404;\\n'",
        "                '    }\\n'",
        "            )",
        "            if \"location /assets/ {\" in config:",
        "                config = config.replace(\"location /assets/ {\", wasm + \"    location /assets/ {\")",
        "            elif \"location / {\" in config:",
        "                config = config.replace(\"location / {\", wasm + \"    location / {\")",
        "            else:",
        "                # Fallback: insert before the first location",
        "                config = re.sub(r'(location\\s+.*?\\{)', wasm + r'    \\1', config, count=1)",
        "            with open(conf, \"w\") as f:",
        "                f.write(config)",
        "            print(f\"Config {conf} updated\")"
    ]

    script_body = "\n".join(script_lines) + "\n"

    def replacer(match):
        return match.group(1) + script_body + match.group(3)

    new_content = re.sub(pattern, replacer, content, flags=re.DOTALL)

    with open('.github/workflows/deploy.yml', 'w') as f:
        f.write(new_content)

run()
