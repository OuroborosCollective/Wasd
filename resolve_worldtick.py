with open('server/src/core/WorldTick.ts', 'r') as f:
    content = f.read()

import re
# Conflict 1
content = re.sub(r'<<<<<<< HEAD\n    // Optimize: Zero-allocation iteration using internal Maps and for\.\.\.of\n    const playersMap = this\.playerSystem\.getPlayersMap\(\);\n    for \(const p of playersMap\.values\(\)\) \{\n=======\n    for \(const p of this\.playerSystem\.getPlayersMap\(\)\.values\(\)\) \{\n>>>>>>> origin/main',
                 '    // Optimize: Zero-allocation iteration using internal Maps and for...of\n    const playersMap = this.playerSystem.getPlayersMap();\n    for (const p of playersMap.values()) {', content)

# Conflict 2
content = re.sub(r'<<<<<<< HEAD\n    const npcsMap = this\.npcSystem\.getNPCsMap\(\);\n    for \(const n of npcsMap\.values\(\)\) \{\n=======\n    for \(const n of this\.npcSystem\.getNPCsMap\(\)\.values\(\)\) \{\n>>>>>>> origin/main',
                 '    const npcsMap = this.npcSystem.getNPCsMap();\n    for (const n of npcsMap.values()) {', content)

# Conflict 3
content = re.sub(r'<<<<<<< HEAD\n      const objectsMap: Map<string, WorldObject> = this\.worldSystem\.objectSystem\.getObjectsMap\(\);\n      for \(const obj of objectsMap\.values\(\)\) \{\n=======\n      for \(const obj of this\.worldSystem\.objectSystem\.getObjectsMap\(\)\.values\(\)\) \{\n>>>>>>> origin/main',
                 '      const objectsMap: Map<string, WorldObject> = this.worldSystem.objectSystem.getObjectsMap();\n      for (const obj of objectsMap.values()) {', content)

with open('server/src/core/WorldTick.ts', 'w') as f:
    f.write(content)
