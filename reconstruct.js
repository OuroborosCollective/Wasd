import fs from 'fs';
import path from 'path';

const content = fs.readFileSync('areloria_final_reconstruction_1773084646.txt', 'utf-8');

const blocks = content.split('---');

for (const block of blocks) {
  const pathMatch = block.match(/PFAD\n([^\n]+)/);
  const contentMatch = block.match(/INHALT\n```[a-z]*\n([\s\S]*?)\n```/);

  if (pathMatch && contentMatch) {
    const filePath = pathMatch[1].trim();
    const fileContent = contentMatch[1];
    
    // Skip if it's the root directory or empty
    if (!filePath || filePath === '/') continue;

    const fullPath = path.join(process.cwd(), filePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, fileContent);
    console.log(`Created ${filePath}`);
  }
}
