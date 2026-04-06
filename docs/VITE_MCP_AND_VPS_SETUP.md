# Vite client + Cursor MCP + VPS

This document explains how to connect your deployed Areloria MMORPG server to Cursor using MCP, and how to align the **Babylon.js (Vite) client** WebSocket URL with that deployment.

## 1) What was added in this repo

- Hardened MCP auth: the MCP API requires `MCP_ADMIN_TOKEN` and does not fall back to an insecure default token.
- MCP helper tools (names may vary by server version), including file listing and connection helpers.
- Client WebSocket URL is configurable through **`VITE_WEBSOCKET_URL`** and falls back to the current page protocol/host (`ws` / `wss`).
- Team-shareable Cursor config example at `.cursor/mcp.json`.

## 2) VPS environment variables

Set these on your VPS (for example in `/opt/areloria/.env`):

```bash
MCP_ADMIN_TOKEN=<very-strong-random-token>
MCP_PUBLIC_SSE_URL=https://your-domain.example/api/mcp/sse
MCP_PUBLIC_MESSAGES_URL=https://your-domain.example/api/mcp/messages?sessionId=<id>
PUBLIC_WEBSOCKET_URL=wss://your-domain.example/ws
```

For the client build:

```bash
VITE_WEBSOCKET_URL=wss://your-domain.example/ws
```

Optional: `CLIENT_ROOT_DIR` if the Node process cwd is not the monorepo root (see `DEPLOYMENT.md`).

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
python3 deploy/vps_connect.py --host YOUR_HOST --user root shell
python3 deploy/vps_connect.py --host YOUR_HOST --user root run "uname -a"
python3 deploy/vps_connect.py \
  --host YOUR_HOST \
  --user root \
  --app-dir /opt/areloria \
  --branch main \
  deploy
```

Notes:

- The script prefers SSH key auth.
- For non-interactive password auth, set `SSH_PASSWORD` or pass `--password` (requires `sshpass`).
- Do not commit passwords or tokens in files.

## 5) Quick verification checklist

1. Health endpoint: `https://your-domain.example/health`
2. MCP SSE endpoint requires auth (no bearer → unauthorized)
3. Cursor MCP server connects and lists tools
4. Game client connects to `wss://your-domain.example/ws` (or same host as the page)

## 6) Security notes

- Never commit real tokens/passwords.
- Rotate `MCP_ADMIN_TOKEN` if it was ever shared.
- Restrict firewall access to your VPS.
