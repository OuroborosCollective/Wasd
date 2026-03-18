const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\\'/g, "'");
  fs.writeFileSync(file, content);
}

fixFile('client/src/ui/AssetBrainViewer.ts');
fixFile('client/src/ui/assetGeneratorPanel.ts');
