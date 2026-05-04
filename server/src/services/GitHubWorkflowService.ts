// @ts-nocheck
import * as yaml from 'js-yaml';

interface WorkflowJob {
  permissions?: {
    contents?: string;
    [key: string]: any;
  };
  steps?: Array<{
    uses?: string;
    run?: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

interface Workflow {
  name?: string;
  on?: any;
  jobs?: Record<string, WorkflowJob>;
  [key: string]: any;
}

export class GitHubWorkflowService {
  public modifyWorkflow(yamlContent: string): string {
    try {
      let doc = yaml.load(yamlContent) as Workflow;

      if (!doc || typeof doc !== 'object') {
        throw new Error('Invalid YAML content');
      }

      if (doc.jobs) {
        for (const jobKey in doc.jobs) {
          const job = doc.jobs[jobKey];

          // 1. Ensure permissions: { contents: "write" }
          if (!job.permissions) {
            job.permissions = { contents: 'write' };
          } else if (!job.permissions.contents) {
            job.permissions.contents = 'write';
          }

          // 2. Process steps
          if (Array.isArray(job.steps)) {
            job.steps = job.steps.map((step) => {
              // Ensure actions/checkout@v4
              if (step.uses && step.uses.startsWith('actions/checkout@')) {
                step.uses = 'actions/checkout@v4';
              }

              // Replace git add commands with git add -A
              if (step.run) {
                const gitAddRegex = /git add\s+[\w\-\.\/\*]+/g;
                if (gitAddRegex.test(step.run)) {
                  step.run = step.run.replace(gitAddRegex, 'git add -A');
                }
              }

              return step;
            });
          }
        }
      }

      const modifiedYaml = yaml.dump(doc, {
        lineWidth: -1,
        noRefs: true,
        quotingType: '"'
      });

      this.validateYaml(modifiedYaml);

      return modifiedYaml;
    } catch (error) {
      throw new Error(`Failed to modify workflow: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private validateYaml(content: string): void {
    try {
      yaml.load(content);
    } catch (e) {
      throw new Error('Generated YAML is invalid');
    }
  }
}