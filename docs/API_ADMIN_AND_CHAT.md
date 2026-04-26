# API: Admin and Chat

Focused reference for admin content APIs and chat/runtime messaging.

## Admin content API (`/api/admin/content`)

Source: `server/src/api/adminContentRoute.ts`.

### Read endpoints

- `GET /meta`
- `GET /choices`
- `GET /glb-scan`
- `GET /glb-gallery-tree`
- `GET /glb-links`
- `GET /asset-pools`
- `GET /model-path-audit`
- `GET /model-needs`

### Write endpoints

- `POST /glb-upload`
- `POST /glb-links`
- `DELETE /glb-links`
- `POST /asset-pools`
- `DELETE /asset-pools`
- `POST /validate-preview`
- `POST /publish-pack`

### Auth model

- `ADMIN_PANEL_TOKEN` via `Authorization: Bearer ...` or `X-Admin-Token`.
- Optional allowlists:
  - `ADMIN_UID_ALLOWLIST`
  - `ADMIN_EMAIL_ALLOWLIST`
- Optional readonly mode: `CONTENT_ADMIN_READONLY=1` blocks write endpoints.

## Chat and status flow

Sources:
- `server/src/modules/chat/ChatChannelRouter.ts`
- `server/src/modules/chat/StatusEmitter.ts`
- `server/src/modules/chat/RedisChatRelay.ts`
- `server/src/modules/npc/NPCChatAgent.ts`

### Channels

- `global`: broadcast to all recipients.
- `local`: proximity-scoped.
- `status`: system/NPC status lines, proximity-scoped.

### Notes

- Router keeps a bounded in-memory message buffer for recency/context reads.
- Redis relay is optional and enabled only when Redis env config is present.
