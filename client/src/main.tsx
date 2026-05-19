// The production 3D browser client boots from client/src/main.ts.
// client/index.html intentionally points to /src/main.ts because the Babylon runtime
// is an imperative canvas app, not a React root. Keep this file as a guard note so
// future agents do not patch the wrong entrypoint while chasing Cyberzen UI issues.
export {};
