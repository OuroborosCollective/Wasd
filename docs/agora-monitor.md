# Ouroboros Agora Live Monitor

The Agora Live Monitor connects the Areloria/Ouroboros project with Open Collective identity and transparent project monitoring.

## Purpose

- Provide a public trust and project status dashboard.
- Expose safe live health data for the Areloria server.
- Prepare Open Collective OAuth login for future supporter, grant, and admin workflows.
- Keep all secrets server-side only.

## Planned routes

- `/agora` public dashboard shell
- `/agora/api/live` safe live monitor JSON
- `/agora/api/finance` safe finance summary placeholder
- `/agora/api/config` safe public configuration state
- `/agora/auth/opencollective/login` OAuth login start
- `/agora/auth/opencollective/callback` OAuth callback

## Security rules

- Never commit real Open Collective secrets.
- `OPEN_COLLECTIVE_CLIENT_SECRET` must only exist on the server or VPS environment.
- Public JSON endpoints must expose booleans and status only, never tokens.
- Browser code must not receive the client secret.

## Environment variables

```env
OPEN_COLLECTIVE_CLIENT_ID=
OPEN_COLLECTIVE_CLIENT_SECRET=
OPEN_COLLECTIVE_CALLBACK_URL=https://areloria.de/agora/auth/opencollective/callback
OPEN_COLLECTIVE_SLUG=ouroboros-collective-are
OPEN_COLLECTIVE_PROJECT_SLUG=agora-project
```

## Future expansion

- Open Collective GraphQL finance sync
- Grant request dashboard
- Reimbursement dashboard
- Supporter-gated admin panels
- WorldTick divergence and ARE guard visualization
- VPS and GitHub deployment monitor
