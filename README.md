# Areloria WASD

Areloria WASD is a high-performance 3D RPG and metaverse platform built on modern web technologies and AI-driven agents. The project combines an immersive game world with a 2D fallback client for mobile devices, World Editor tools, and administrative controls.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-22.x-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build:all

# Or run in development mode
pnpm dev:all
```

## 🏗 Architecture

### Monorepo Structure

```
├── apps/
│   ├── api/          # Node.js API backend
│   └── web/          # Web application
├── client/           # 3D client (Three.js/React)
├── client-2d/       # 2D fallback client (mobile devices)
├── server/           # Main game server (Node.js/TypeScript)
├── backend/          # Python services (scoring, analytics)
├── packages/         # Shared packages
│   ├── core/        # Core game logic
│   ├── core-network/# Network system
│   ├── shared/      # Shared utilities
│   └── types/       # TypeScript types
└── admin-tools/     # GM panel, World Editor, rollback tools
```

### Clients

| Client | Technology | Target |
|--------|-----------|--------|
| 3D Client | React + Three.js | Desktop browsers |
| 2D Client | React + Canvas | Mobile, low-end devices |

The server automatically detects device capabilities and redirects to the appropriate client.

## 📦 Packages

### Core Packages (`packages/`)

- **`@arelorian/core`** - Core game mechanics and logic
- **`@arelorian/core-network`** - Multiplayer networking
- **`@arelorian/shared`** - Shared utilities
- **`@arelorian/types`** - TypeScript definitions

### Applications (`apps/` & `server/`)

- **`@wasd/server`** - Main game server with Express/Genkit
- **`@wasd/client`** - 3D Three.js client
- **`@arelorian/client-2d`** - 2D Canvas fallback
- **`@wasd/api`** - REST API services

## 🛠 Tech Stack

- **Frontend**: React, TypeScript, Three.js, Tailwind CSS
- **Backend**: Node.js, Python, Express, Genkit AI
- **Database**: Supabase (PostgreSQL), Redis
- **Infrastructure**: Docker, Nginx, GitHub Actions
- **AI**: Custom LLM Agent Logic (Jules Framework)

## 📖 Development

### Prerequisites

- Node.js 22.x
- pnpm 9.x
- Python 3.x (for backend services)
- Docker (optional, for containerized deployment)

### Scripts

```bash
# Build all packages
pnpm build:all

# Build individual packages
pnpm build:network   # Build core-network
pnpm build:2d       # Build 2D client
pnpm build:3d        # Build 3D client

# Development mode
pnpm dev:all        # Run all dev servers
pnpm dev:network    # Network server only
pnpm dev:2d         # 2D client only
pnpm dev:3d         # 3D client only
```

## 🌐 Deployment

### Docker Production Build

```bash
# Build production Docker image
docker build -f Dockerfile.prod -t areloria:latest .

# Run container
docker run -d --name areloria -p 3000:3000 -e NODE_ENV=production areloria:latest
```

### GitHub Actions

The project uses GitHub Actions for CI/CD:
- Auto-deploy to VPS on push to `main`
- Build and test on PRs
- Security scanning

## 📁 Documentation

Key documents:
- `ARCHITECTURE_OVERVIEW.md` - System architecture
- `DEPLOYMENT.md` - Deployment guide
- `docs/` - Detailed documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a PR

## 📄 License

MIT License - See LICENSE file for details.
# Deployment test
