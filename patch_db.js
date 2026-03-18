const fs = require('fs');

const file = 'server/src/core/Database.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'database: process.env.DB_NAME || "areloria",',
  'database: process.env.DB_NAME || "wasd_db",'
);

code = code.replace(
  'password: process.env.DB_PASSWORD || "2N00py123-",',
  'password: process.env.DB_PASSWORD || "2N00py123---",'
);

fs.writeFileSync(file, code);
