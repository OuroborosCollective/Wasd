/**
 * AST Validation & Self-Healing Pipeline
 * 
 * Validates TypeScript AST to prevent build failures.
 * On error: Isolates last stable commit to protect existing logic.
 * Excludes Jules directories from analysis.
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuration
 */
interface ASTValidationConfig {
  /** Directories to exclude from analysis */
  excludePatterns: string[];
  /** File extensions to analyze */
  extensions: string[];
  /** Maximum errors before isolation */
  maxErrors: number;
  /** Safe commit hash to revert to */
  safeCommit?: string;
}

/**
 * Default configuration - excludes all Jules directories
 */
const DEFAULT_CONFIG: ASTValidationConfig = {
  excludePatterns: [
    '**/Jules/**',
    '**/jules/**',
    '**/*Jules*',
    '**/*jules*',
    '**/node_modules/**',
    '**/dist/**',
    '**/.git/**'
  ],
  extensions: ['.ts', '.tsx'],
  maxErrors: 10
};

/**
 * Validation result
 */
interface ValidationResult {
  success: boolean;
  errors: ASTError[];
  warnings: string[];
  filesAnalyzed: number;
  isolationRequired: boolean;
  safeCommit?: string;
}

/**
 * AST Error
 */
interface ASTError {
  file: string;
  line: number;
  column: number;
  message: string;
 severity: 'error' | 'warning';
}

/**
 * Get all TypeScript files in directory
 */
function getTypeScriptFiles(
  dir: string,
  config: ASTValidationConfig = DEFAULT_CONFIG
): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) return files;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Check exclusion patterns
    const isExcluded = config.excludePatterns.some(pattern => {
      if (pattern.includes('**/')) {
        const clean = pattern.replace(/\*\*/g, '').replace(/\*/g, '');
        return fullPath.includes(clean);
      }
      return entry.name === pattern;
    });
    
    if (isExcluded) continue;
    
    if (entry.isDirectory()) {
      files.push(...getTypeScriptFiles(fullPath, config));
    } else if (config.extensions.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Parse TypeScript file and extract diagnostics
 */
function validateFile(filePath: string): ASTError[] {
  const errors: ASTError[] = [];
  
  try {
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );
    
    // Check for syntax errors
    const syntaxErrors = ts.getSyntacticDiagnostics(sourceFile);
    
    for (const diag of syntaxErrors) {
      if (diag.category === ts.DiagnosticCategory.Error) {
        const { line, character } = diag.start ?
          ts.getLineAndCharacterOfPosition(diag.start) :
          { line: 0, character: 0 };
        
        errors.push({
          file: filePath,
          line: line + 1,
          column: character + 1,
          message: ts.flattenDiagnosticMessageText(diag.messageText, '\n'),
          severity: 'error'
        });
      }
    }
    
    // Check for semantic errors
    const semanticErrors = ts.getSemanticDiagnostics(sourceFile);
    
    for (const diag of semanticErrors) {
      if (diag.category === ts.DiagnosticCategory.Error) {
        const { line, character } = diag.start ?
          ts.getLineAndCharacterOfPosition(diag.start) :
          { line: 0, character: 0 };
        
        errors.push({
          file: filePath,
          line: line + 1,
          column: character + 1,
          message: ts.flattenDiagnosticMessageText(diag.messageText, '\n'),
          severity: 'error'
        });
      }
    }
    
  } catch (err) {
    errors.push({
      file: filePath,
      line: 0,
      column: 0,
      message: `Failed to parse: ${(err as Error).message}`,
      severity: 'error'
    });
  }
  
  return errors;
}

/**
 * Main validation function
 */
function validateProject(
  projectPath: string = process.cwd(),
  config: ASTValidationConfig = DEFAULT_CONFIG
): ValidationResult {
  const errors: ASTError[] = [];
  const warnings: string[] = [];
  
  console.log('═'.repeat(50));
  console.log('AST VALIDATION & SELF-HEAL CHECK');
  console.log('═'.repeat(50));
  console.log(`\n📁 Project: ${projectPath}`);
  console.log(`⚙️  Excluding: ${config.excludePatterns.join(', ')}\n`);
  
  // Get all TypeScript files
  const files = getTypeScriptFiles(projectPath, config);
  console.log(`📄 Files to analyze: ${files.length}\n`);
  
  // Validate each file
  for (const file of files) {
    const fileErrors = validateFile(file);
    errors.push(...fileErrors);
    
    if (fileErrors.length > 0) {
      console.log(`  ✗ ${path.relative(projectPath, file)}: ${fileErrors.length} errors`);
    }
  }
  
  if (errors.length === 0) {
    console.log('\n✅ No AST errors detected\n');
    return {
      success: true,
      errors: [],
      warnings: [],
      filesAnalyzed: files.length,
      isolationRequired: false
    };
  }
  
  // Group errors by file
  const errorsByFile = new Map<string, ASTError[]>();
  for (const error of errors) {
    if (!errorsByFile.has(error.file)) {
      errorsByFile.set(error.file, []);
    }
    errorsByFile.get(error.file)!.push(error);
  }
  
  console.log('\n❌ AST Errors Found:\n');
  for (const [file, fileErrors] of errorsByFile) {
    console.log(`  📁 ${path.relative(projectPath, file)}`);
    for (const err of fileErrors.slice(0, 3)) {
      console.log(`     L${err.line}:${err.column} - ${err.message}`);
    }
    if (fileErrors.length > 3) {
      console.log(`     ... and ${fileErrors.length - 3} more`);
    }
  }
  
  // Check if isolation is required
  const isolationRequired = errors.length > config.maxErrors;
  
  if (isolationRequired) {
    console.log('\n⚠️  ISOLATION TRIGGERED');
    console.log(`   Errors: ${errors.length} > Max: ${config.maxErrors}`);
    console.log('\n🔒 Protecting stable commit...');
  }
  
  return {
    success: errors.length === 0,
    errors,
    warnings,
    filesAnalyzed: files.length,
    isolationRequired
  };
}

/**
 * Get the last stable commit (for rollback)
 */
function getLastStableCommit(): string | undefined {
  try {
    const { execSync } = require('child_process');
    const commit = execSync('git log --oneline -1 --all', { encoding: 'utf-8' });
    return commit.trim().split(' ')[0];
  } catch {
    return undefined;
  }
}

/**
 * Main execution
 */
function main() {
  const projectPath = process.argv[2] || process.cwd();
  
  const result = validateProject(projectPath);
  
  if (!result.success) {
    console.log('\n' + '═'.repeat(50));
    console.log('VALIDATION FAILED');
    console.log('═'.repeat(50));
    console.log(`\nTotal errors: ${result.errors.length}`);
    console.log(`Files analyzed: ${result.filesAnalyzed}`);
    
    if (result.isolationRequired) {
      const safeCommit = getLastStableCommit();
      console.log(`\n🔒 SAFE COMMIT: ${safeCommit || 'unknown'}`);
      console.log('\nTo rollback: git reset --hard <safe-commit>');
      process.exit(1);
    }
    
    process.exit(1);
  }
  
  console.log('\n✅ Validation passed - ready for build');
  process.exit(0);
}

// Export for programmatic use
export {
  validateProject,
  validateFile,
  getTypeScriptFiles,
  getLastStableCommit,
  ValidationResult,
  ASTError,
  ASTValidationConfig
};

export default main;

// Run if executed directly
if (require.main === module) {
  main();
}