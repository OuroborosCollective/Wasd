const fs = require('fs');
let file = 'client/src/networking/websocketClient.ts';
let content = fs.readFileSync(file, 'utf8');

// The line `const myPlayer = data.players.find((p: any) => p.id === myPlayerId);`
// will crash if data.players is undefined. We need robust optional chaining.

content = content.replace(
  'const myPlayer = data.players.find((p: any) => p.id === myPlayerId);',
  'const myPlayer = data.players?.find((p: any) => p.id === myPlayerId);'
);

content = content.replace(
  '        if (latestState && latestState.players) {',
  '        if (latestState && Array.isArray(latestState.players)) {'
);

fs.writeFileSync(file, content);
