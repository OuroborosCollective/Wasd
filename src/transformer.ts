import { parseDocument, isMap, isSeq } from 'yaml';

export function transformYaml(yamlContent: string): string {
  const doc = parseDocument(yamlContent);
  const jobs = doc.get('jobs');

  if (isMap(jobs)) {
    jobs.items.forEach((jobPair) => {
      const job = jobPair.value;
      if (isMap(job)) {
        const steps = job.get('steps');
        if (isSeq(steps)) {
          for (let i = 0; i < steps.items.length; i++) {
            const step = steps.items[i];
            if (isMap(step) && step.get('uses') === 'pnpm/action-setup@v4') {
              let withNode = step.get('with');
              
              if (!isMap(withNode)) {
                withNode = doc.createMap();
                step.set('with', withNode);
              }
              
              withNode.set('run_install', false);

              const newStep = doc.createNode({
                name: 'Install Dependencies',
                run: 'pnpm install --frozen-lockfile'
              });

              steps.items.splice(i + 1, 0, newStep);
              i++;
            }
          }
        }
      }
    });
  }

  return doc.toString();
}