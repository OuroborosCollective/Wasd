/**
 * Template Generator for ARE Module Standard
 * 
 * Generates standard module template files from templates/.
 * 
 * Usage:
 *   node scripts/generate-module-template.mjs <ModuleName> [--path=<output-dir>]
 * 
 * Examples:
 *   node scripts/generate-module-template.mjs Combat
 *   node scripts/generate-module-template.mjs NPCMemory --path=server/src/modules/npc
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { argv } from 'process';

const TEMPLATES_DIR = 'server/src/core/are/templates';
const DEFAULT_OUTPUT_DIR = 'server/src/modules';

function toCamelCase(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function toSnakeCase(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

function generateFile(templatePath, moduleName, outputPath) {
  const template = readFileSync(templatePath, 'utf-8');
  
  const moduleNameLower = toCamelCase(moduleName);
  const moduleNameSnake = toSnakeCase(moduleName);
  
  const content = template
    .replace(/\{\{MODULE_NAME\}\}/g, moduleName)
    .replace(/\{\{moduleName\}\}/g, moduleNameLower)
    .replace(/\{\{module_name\}\}/g, moduleNameSnake);
  
  // Ensure output directory exists
  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  writeFileSync(outputPath, content);
  console.log(`Generated: ${outputPath}`);
}

function main() {
  const args = argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node scripts/generate-module-template.mjs <ModuleName> [--path=<output-dir>]');
    console.log('');
    console.log('Example:');
    console.log('  node scripts/generate-module-template.mjs Combat');
    console.log('  node scripts/generate-module-template.mjs NPCMemory --path=server/src/modules/npc');
    process.exit(1);
  }
  
  const moduleName = args[0];
  const pathArg = args.find(a => a.startsWith('--path='));
  const outputDir = pathArg ? pathArg.split('=')[1] : `${DEFAULT_OUTPUT_DIR}/${toSnakeCase(moduleName).split('_')[0]}`;
  
  const templates = [
    { name: 'Types', template: 'ModuleNameTypes.ts.template', output: `${outputDir}/${moduleName}Types.ts` },
    { name: 'Delta', template: 'ModuleNameDelta.ts.template', output: `${outputDir}/${moduleName}Delta.ts` },
    { name: 'Snapshot', template: 'ModuleNameSnapshot.ts.template', output: `${outputDir}/${moduleName}Snapshot.ts` },
    { name: 'TickSystem', template: 'ModuleNameTickSystem.ts.template', output: `${outputDir}/${moduleName}TickSystem.ts` },
  ];
  
  console.log(`\nGenerating ARE module template for: ${moduleName}`);
  console.log(`Output directory: ${outputDir}\n`);
  
  for (const { name, template, output } of templates) {
    const templatePath = join(TEMPLATES_DIR, template);
    if (existsSync(templatePath)) {
      generateFile(templatePath, moduleName, output);
    } else {
      console.error(`Template not found: ${templatePath}`);
    }
  }
  
  console.log('\nDone! Remember to:');
  console.log('1. Review generated files and fill in business logic');
  console.log('2. Register with TickSystemRegistry');
  console.log('3. Add tests for determinism');
  console.log('4. Update imports in dependent modules');
}

main();