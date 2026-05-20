// @ARE-GUARD-EXEMPT: non-sim module
export function worldRoutes() {
  return [
    { path: "/api/world/chunk", method: "GET" },
    { path: "/api/world/events", method: "GET" }
  ];
}