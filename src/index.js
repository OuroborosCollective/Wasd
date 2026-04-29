import fs from 'node:fs';
import { globSync } from 'glob';
import { parseDocument } from 'yaml';
import { transformer } from './transformer.js';
import { validator } from './validator.js';

const files = globSync('.github/workflows/*.yml');

for (const file of files) {
  try {
    const originalContent = fs.readFileSync(file, 'utf8');
    const doc = parseDocument(originalContent);

    transformer(doc);

    const jsContent = doc.toJS();
    validator(jsContent);

    const updatedContent = doc.toString();

    if (originalContent !== updatedContent) {
      fs.writeFileSync(file, updatedContent, 'utf8');
      console.log(`Successfully updated: ${file}`);
    }
  } catch (error) {
    console.error(`Failed to process ${file}:`, error.message);
    process.exit(1);
  }
}