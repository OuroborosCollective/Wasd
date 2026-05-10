# VPS Deployment Workflow

## GitHub Secrets Needed

Add these in your repo Settings → Secrets and variables → Actions:

| Secret | Value | Description |
|--------|-------|-------------|
| `VPS_HOST` | `46.202.154.25` | Your VPS IP address |
| `VPS_USER` | `root` | SSH username |
| `VPS_SSH_KEY` | SSH private key | The private key content (not password) |
| `VPS_PORT` | `22` | SSH port (default 22) |

## How to get SSH key for GitHub:

1. **If you already have an SSH key:**
   ```bash
   cat ~/.ssh/id_rsa
   ```
   Copy the entire content (including -----BEGIN and -----END)

2. **If you need a new key:**
   ```bash
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/vps_deploy -N ""
   # Then add the public key to your VPS:
   ssh-copy-id -i ~/.ssh/vps_deploy.pub root@46.202.154.25
   ```

## Manual Deploy

1. Go to Actions tab
2. Select "VPS Deploy" workflow
3. Click "Run workflow" → Branch: main

## Auto Deploy (on push)

The workflow runs automatically when:
- Code is pushed to `main` branch
- Tags are pushed (version releases)

## Troubleshooting

Check the workflow run logs for any errors. Common issues:
- SSH key not added to VPS
- Wrong permissions on key (should be 600)
- Firewall blocking port 22