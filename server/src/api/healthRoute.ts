export function healthRoute() {
  return {
    ok: true,
    service: "areloria-server",
    timestamp: Date.now()
  };
}