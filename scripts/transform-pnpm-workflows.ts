import * as fs from 'fs';
import * as path from 'path';

class WorkflowTransformer {
  public transform(content: string): string {
    let output = content;

    if (output.includes('actions/setup-node') && !output.includes('pnpm/action-setup')) {
      output = output.replace(
        /(\s+)- uses: actions\/setup-node/g,
        '$1- uses: pnpm/action-setup@v3\n$1  with:\n$1    version: 9$1- uses: actions/setup-node'
      );
    }

    output = output.replace(/cache:\s*['"]?(npm|yarn)['"]?/g, "cache: 'pnpm'");
    output = output.replace(/\bnpm install\b/g, 'pnpm install');
    output = output.replace(/\bnpm ci\b/g, 'pnpm install --frozen-lockfile');
    output = output.replace(/\bnpm run\b/g, 'pnpm run');
    output = output.replace(/\byarn install\b/g, 'pnpm install');
    output = output.replace(/\byarn\b/g, 'pnpm');

    return output;
  }
}

function runTransformation(): void {
  const transformer = new WorkflowTransformer();
  const workflowsDir = path.join(process.cwd(), '.github', 'workflows');

  if (!fs.existsSync(workflowsDir)) {
    console.error(`Workflow directory not found at: ${workflowsDir}`);
    process.exit(1);
  }

  const workflowFiles = fs.readdirSync(workflowsDir).filter(file => 
    file.endsWith('.yml') || file.endsWith('.yaml')
  );

  let updatedFilesCount = 0;

  workflowFiles.forEach(file => {
    const filePath = path.join(workflowsDir, file);
    const originalContent = fs.readFileSync(filePath, 'utf8');
    const transformedContent = transformer.transform(originalContent);

    if (originalContent !== transformedContent) {
      fs.writeFileSync(filePath, transformedContent, 'utf8');
      console.log(`Successfully modified: ${file}`);
      updatedFilesCount++;
    }
  });

  if (updatedFilesCount === 0) {
    console.log('No workflows required modification.');
  } else {
    console.log(`Finished. Total files modified: ${updatedFilesCount}`);
  }
}

runTransformation();