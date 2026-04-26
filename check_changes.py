import os

files = [
    'client/index.html',
    'client/src/main.ts',
    'client/src/networking/websocketClient.ts',
    'client/src/ai/watchdogTelemetry.ts',
    'server/src/core/WorldTick.ts',
    'server/src/modules/world/WorldObjectSystem.ts'
]

for f in files:
    print(f"--- {f} ---")
    if os.path.exists(f):
        # Just show some context for relevant parts
        if 'client/index.html' == f:
            os.system(f"grep -C 2 'posthog' {f}")
        elif 'client/src/main.ts' == f:
            os.system(f"grep -C 2 'posthog.identify' {f}")
        elif 'client/src/networking/websocketClient.ts' == f:
            os.system(f"grep -C 2 'zone_entered' {f}")
        elif 'client/src/ai/watchdogTelemetry.ts' == f:
            os.system(f"grep -C 2 'watchdog_log' {f}")
        elif 'server/src/core/WorldTick.ts' == f:
            # Check for broadcastState structure
            os.system(f"grep -n 'broadcastState' {f}")
            os.system(f"sed -n '3436,3445p' {f}")
        elif 'server/src/modules/world/WorldObjectSystem.ts' == f:
            os.system(f"grep -n 'getObjectsMap' {f}")
    else:
        print("File not found")
