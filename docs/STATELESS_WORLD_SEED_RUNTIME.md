# Stateless World Seed Runtime

`WASD_WORLD_SEED` is required runtime configuration for stateless deterministic world generation.

## Required locations

### GitHub Actions

Set a repository secret or variable named exactly:

```txt
WASD_WORLD_SEED
```

Recommended value for current production world:

```txt
areloria:earth_1_1
```

### VPS Runtime

Set the same key in the VPS deploy environment file used by Docker Compose, usually:

```txt
/opt/areloria/.env.docker
```

Required entry:

```env
WASD_WORLD_SEED=areloria:earth_1_1
```

## Why this is required

World generation must not contain hidden module-level seed literals. The seed may be stable, but it must come from explicit runtime configuration. If `WASD_WORLD_SEED` is missing, the server should fail fast instead of silently generating a different world.
