#!/bin/bash
ssh -t user@your-vps-ip "cd /opt/areloria && git checkout main && git pull origin main && pnpm install && pnpm run build"