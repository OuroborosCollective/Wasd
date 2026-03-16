const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server/src/core/Migrations.ts');
let code = fs.readFileSync(filePath, 'utf8');

const tableCreates = `
    // Player lands
    await db.query(\`
      CREATE TABLE IF NOT EXISTS player_lands (
        id VARCHAR(36) PRIMARY KEY,
        owner_id VARCHAR(255) NOT NULL,
        owner_name VARCHAR(255),
        name VARCHAR(255) DEFAULT 'My Land',
        x FLOAT NOT NULL,
        y FLOAT NOT NULL,
        radius FLOAT DEFAULT 100,
        claimed_at TIMESTAMPTZ DEFAULT NOW()
      )
    \`);

    // Land structures
    await db.query(\`
      CREATE TABLE IF NOT EXISTS land_structures (
        id VARCHAR(36) PRIMARY KEY,
        land_id VARCHAR(36) NOT NULL,
        type VARCHAR(64) NOT NULL,
        x FLOAT DEFAULT 0,
        y FLOAT DEFAULT 0,
        z FLOAT DEFAULT 0,
        rot_y FLOAT DEFAULT 0,
        scale FLOAT DEFAULT 1.0,
        glb_path TEXT,
        name VARCHAR(255),
        placed_at TIMESTAMPTZ DEFAULT NOW()
      )
    \`);
`;

// Insert the table creates before the existing "// Land plots"
const targetStr = "    // Land plots";
if (code.includes(targetStr)) {
  code = code.replace(targetStr, tableCreates + "\n" + targetStr);
  fs.writeFileSync(filePath, code);
  console.log("Successfully updated Migrations.ts");
} else {
  console.log("Could not find target string in Migrations.ts");
}
