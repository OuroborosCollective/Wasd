# World Generation

Die Welt wird aus `seed + coordinates` erzeugt.

## Chunkstruktur
Jeder Chunk enthält:
- Terrain
- Biomtyp
- Ressourcen
- Objektliste
- Strukturen
- Ruinen oder Dungeon-Eingänge

## Simulationsebenen
1. Dormant
2. Background simulation
3. Active simulation
4. Full simulation

Nur beobachtete Regionen werden hochauflösend simuliert.