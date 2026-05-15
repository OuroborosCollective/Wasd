// Strip literal placeholder secrets injected by some CI/agent environments.
for (const key of Object.keys(process.env)) {
  if (process.env[key] === "[REDACTED]") {
    delete process.env[key];
  }
}
