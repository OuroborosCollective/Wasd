const fs = require('fs');
const file = 'server/src/modules/land/LandSystem.ts';
let code = fs.readFileSync(file, 'utf8');

const search = `    // Load all lands from DB
    const result = await this.db.query(\`SELECT * FROM player_lands\`).catch(() => ({ rows: [] }));
    for (const row of result.rows) {
      const structResult = await this.db.query(
        \`SELECT * FROM land_structures WHERE land_id=$1\`, [row.id]
      ).catch(() => ({ rows: [] }));

      this.lands.set(row.id, {
        id: row.id,
        ownerId: row.owner_id,
        ownerName: row.owner_name,
        name: row.name,
        x: row.x,
        y: row.y,
        radius: row.radius,
        claimedAt: row.claimed_at,
        structures: structResult.rows.map((s: any) => ({
          id: s.id,
          landId: s.land_id,
          type: s.type,
          x: s.x, y: s.y, z: s.z,
          rotY: s.rot_y,
          scale: s.scale,
          glbPath: s.glb_path,
          name: s.name,
          placedAt: s.placed_at,
        })),
      });
    }`;

const replace = `    // Load all lands from DB
    const result = await this.db.query(\`SELECT * FROM player_lands\`).catch(() => ({ rows: [] }));

    // Load all structures in one query to avoid N+1 problem
    const structsResult = await this.db.query(\`SELECT * FROM land_structures\`).catch(() => ({ rows: [] }));

    // Group structures by land_id
    const structuresByLandId = new Map<string, LandStructure[]>();
    for (const s of structsResult.rows) {
      if (!structuresByLandId.has(s.land_id)) {
        structuresByLandId.set(s.land_id, []);
      }
      structuresByLandId.get(s.land_id)!.push({
        id: s.id,
        landId: s.land_id,
        type: s.type,
        x: s.x, y: s.y, z: s.z,
        rotY: s.rot_y,
        scale: s.scale,
        glbPath: s.glb_path,
        name: s.name,
        placedAt: s.placed_at,
      });
    }

    for (const row of result.rows) {
      this.lands.set(row.id, {
        id: row.id,
        ownerId: row.owner_id,
        ownerName: row.owner_name,
        name: row.name,
        x: row.x,
        y: row.y,
        radius: row.radius,
        claimedAt: row.claimed_at,
        structures: structuresByLandId.get(row.id) || [],
      });
    }`;

if (code.includes(search)) {
  code = code.replace(search, replace);
  fs.writeFileSync(file, code);
  console.log('Successfully updated LandSystem.ts');
} else {
  console.log('Could not find code to replace.');
}
