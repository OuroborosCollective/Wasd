# PlayCanvas + Cursor MCP Integration (VPS)

This document explains how to connect your deployed Areloria MMORPG server to Cursor using MCP, and how to keep PlayCanvas WebSocket networking aligned with that deployment.

## 1) What was added in this repo

- Hardened MCP auth: the MCP API now requires `MCP_ADMIN_TOKEN` and no longer falls back to a default insecure token.
- New MCP helper tools:
  - `list_files`
  - `get_playcanvas_connection_profile`
- PlayCanvas client WebSocket URL is now configurable through `VITE_WEBSOCKET_URL` and falls back safely based on the current page protocol/host.
- Team-shareable Cursor config example at `.cursor/mcp.json`.

## 2) VPS environment variables

Set these on your VPS (for example in `/opt/areloria/.env`):

```bash
MCP_ADMIN_TOKEN=<very-strong-random-token>
MCP_PUBLIC_SSE_URL=https://your-domain.example/api/mcp/sse
MCP_PUBLIC_MESSAGES_URL=https://your-domain.example/api/mcp/messages?sessionId=<id>
PUBLIC_WEBSOCKET_URL=wss://your-domain.example/ws
```

For client build/runtime (if needed for your deployment strategy):

```bash
VITE_WEBSOCKET_URL=wss://your-domain.example/ws
```

## 3) Reverse proxy requirements (Nginx)

For `/api/mcp/sse`, disable buffering and keep long-lived connections:

```nginx
location /api/mcp/sse {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600;
}
```

For game WebSocket:

```nginx
location /ws {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 600;
}
```

## 4) Cursor MCP setup

Use `.cursor/mcp.json` in this repo (or your local Cursor config):

```json
{
  "mcpServers": {
    "areloria-vps": {
      "url": "https://your-domain.example/api/mcp/sse",
      "headers": {
        "Authorization": "Bearer REPLACE_WITH_MCP_ADMIN_TOKEN"
      }
    }
  }
}
```

Then restart Cursor.

## 4b) Python SSH helper script

You can use `deploy/vps_connect.py` for interactive SSH or automated deploy commands.

Examples:

```bash
# 1) Interactive SSH login
python3 deploy/vps_connect.py --host 46.202.154.25 --user root shell

# 2) Run one command remotely
python3 deploy/vps_connect.py --host 46.202.154.25 --user root run "uname -a"

# 3) Run the Areloria update flow on VPS
python3 deploy/vps_connect.py \
  --host 46.202.154.25 \
  --user root \
  --app-dir /opt/areloria \
  --branch cursor/mmorpq-playcanvas-connection-3e3d \
  deploy
```

Notes:
- The script prefers SSH key auth.
- If you want non-interactive password auth, set `SSH_PASSWORD` or pass `--password` (requires `sshpass`).
- Do not commit passwords or tokens in files.

## 5) Quick verification checklist

1. Health endpoint works:
   - `https://your-domain.example/health`
2. MCP SSE endpoint requires auth:
   - without bearer token -> unauthorized
3. Cursor MCP server connects and lists tools.
4. PlayCanvas client connects to `wss://your-domain.example/ws`.

## 6) Security notes

- Never commit real tokens/passwords.
- Rotate `MCP_ADMIN_TOKEN` if it was ever shared.
- Restrict firewall access to your VPS.
