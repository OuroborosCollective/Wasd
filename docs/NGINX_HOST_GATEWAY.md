# Areloria Host Nginx Gateway

The production Docker stack keeps the Areloria engine bound to the host loopback port:

```text
127.0.0.1:3001 -> arelorian-engine:3001
```

Nginx is intentionally treated as the host edge service, not as a Docker service in the WASD compose stack. This keeps Supabase/Kong free to use its own ports and prevents the game stack from taking over unrelated host routing.

## Install or update

Run on the VPS as root or through sudo from the repository root:

```bash
sudo ARELORIAN_DOMAIN=arelorian.de \
  ARELORIAN_WWW_DOMAIN=www.arelorian.de \
  ARELORIAN_PORT=3001 \
  bash scripts/install-nginx-host-gateway.sh
```

The script:

- installs Nginx on apt-based hosts when missing,
- writes `/etc/nginx/conf.d/arelorian-websocket-map.conf`,
- writes `/etc/nginx/sites-available/arelorian-game`,
- links it into `/etc/nginx/sites-enabled/arelorian-game`,
- backs up previous managed files,
- validates with `nginx -t`,
- reloads Nginx only after validation succeeds.

## Supported routes

The generated host gateway sends these routes to `127.0.0.1:3001`:

- `/`
- `/ws`
- `/socket.io/`
- `/2d/`
- `/3d/`
- `/portal/`

## Notes

- TLS/certbot is intentionally not automated in this script because certificate state is host-specific.
- The script does not change Docker Compose.
- The script does not expose the engine directly to the public network; Docker still binds the engine host port to `127.0.0.1`.
