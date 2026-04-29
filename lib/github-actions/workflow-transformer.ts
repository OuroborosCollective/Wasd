import * as yaml from 'js-yaml';

export class WorkflowTransformer {
  public optimizePnpmSetup(yamlContent: string): string {
    const doc = yaml.load(yamlContent) as any;

    if (!doc || typeof doc !== 'object' || !doc.jobs) {
      return yamlContent;
    }

    Object.keys(doc.jobs).forEach((jobKey) => {
      const job = doc.jobs[jobKey];
      if (job && Array.isArray(job.steps)) {
        let i = 0;
        while (i < job.steps.length) {
          const step = job.steps[i];
          if (step.uses && step.uses === 'pnpm/action-setup@v4') {
            if (!step.with) {
              step.with = {};
            }
            step.with.run_install = false;

            const installStep = {
              name: 'Install dependencies',
              run: 'pnpm install --frozen-lockfile'
            };

            job.steps.splice(i + 1, 0, installStep);
            i++; 
          }
          i++;
        }
      }
    });

    return yaml.dump(doc, {
      lineWidth: -1,
      noRefs: true,
      quotingType: '"'
    });
  }
}