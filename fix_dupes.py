import os

def fix_file(path, pattern):
    with open(path, 'r') as f:
        content = f.read()
    # If the pattern appears twice, remove the first occurrence
    if content.count(pattern) > 1:
        content = content.replace(pattern, "", 1)
        with open(path, 'w') as f:
            f.write(content)
        print(f"Fixed duplicates in {path}")

fix_file('server/src/modules/player/PlayerSystem.ts', '  getPlayersMap(): Map<string, any> {\n    return this.players;\n  }\n')
fix_file('server/src/modules/npc/NPCSystem.ts', '  getNPCsMap(): Map<string, any> {\n    return this.npcs;\n  }\n')
fix_file('server/src/modules/world/WorldObjectSystem.ts', '  public getObjectsMap(): Map<string, WorldObject> {\n    return this.objects;\n  }\n')
