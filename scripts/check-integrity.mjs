import fs from 'node:fs';
import path from 'node:path';

async function run() {
  let yaml;

  try {
    const yamlModule = await import('yaml');
    yaml = yamlModule.default || yamlModule;
  } catch (err) {
    console.error('Error: The "yaml" package is required but not installed.');
    console.error('Please ensure "pnpm install" has been executed in the CI environment.');
    process.exit(1);
  }

  const projectRoot = process.cwd();
  const filesToCheck = [
    { name: 'pnpm-lock.yaml', optional: true },
    { name: 'package.json', optional: false }
  ];

  try {
    for (const file of filesToCheck) {
      const filePath = path.resolve(projectRoot, file.name);

      if (!fs.existsSync(filePath)) {
        if (file.optional) continue;
        throw new Error(`Required file missing: ${file.name}`);
      }

      const content = fs.readFileSync(filePath, 'utf8');

      if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
        yaml.parse(content);
      } else if (file.name.endsWith('.json')) {
        JSON.parse(content);
      }
    }

    console.log('Integrity check successful: All critical files are present and syntactically valid.');
    process.exit(0);
  } catch (error) {
    console.error('Integrity check failed:', error.message);
    process.exit(1);
  }
}

run();