import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import { validate } from './validator.js';
import { refactor } from './refactor.js';
import { report } from './reporter.js';

async function main() {
  try {
    const isValid = await validate();
    if (!isValid) {
      process.exit(1);
    }

    const files = await glob('.github/workflows/*.yml');
    const stats = {
      totalFiles: files.length,
      modifiedFiles: 0,
      addedLines: 0,
      removedLines: 0
    };

    for (const file of files) {
      const filePath = path.resolve(file);
      const content = await fs.readFile(filePath, 'utf-8');
      
      const result = refactor(content);

      if (result.hasChanges) {
        await fs.writeFile(filePath, result.output, 'utf-8');
        stats.modifiedFiles++;
        stats.addedLines += result.stats.added;
        stats.removedLines += result.stats.removed;
      }
    }

    report(stats);
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exit(1);
  }
}

main();