import fs from 'fs';
import path from 'path';

function addNoCheck(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      addNoCheck(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (!content.includes('// @ts-nocheck')) {
        fs.writeFileSync(fullPath, '// @ts-nocheck\n' + content);
        console.log(`Added @ts-nocheck to ${fullPath}`);
      }
    }
  }
}

const srcDir = path.resolve(process.cwd(), 'server/src');
if (fs.existsSync(srcDir)) {
  addNoCheck(srcDir);
} else {
  console.error('Source directory not found');
}
