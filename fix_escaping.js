const fs = require('fs');
let file = 'client/src/ui/assetGeneratorPanel.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\\\$/g, "$");
fs.writeFileSync(file, content);
