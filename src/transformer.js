import { parseDocument, isMap, isSeq } from 'yaml';

export function transform(yamlString) {
  const doc = parseDocument(yamlString);
  if (!doc.contents || !isMap(doc.contents)) return yamlString;

  const jobs = doc.get('jobs');
  if (!isMap(jobs)) return doc.toString();

  jobs.items.forEach((jobPair) => {
    const job = jobPair.value;
    if (!isMap(job)) return;

    const steps = job.get('steps');
    if (!isSeq(steps)) return;

    for (let i = 0; i < steps.items.length; i++) {
      const step = steps.items[i];
      if (!isMap(step)) continue;

      const uses = step.get('uses');
      if (typeof uses === 'string' && (uses.includes('pnpm/action-setup@v3') || uses.includes('pnpm/action-setup@v4'))) {
        let withBlock = step.get('with');
        if (!withBlock) {
          withBlock = doc.createNode({});
          step.set('with', withBlock);
          withBlock = step.get('with');
        }

        if (isMap(withBlock)) {
          withBlock.set('run_install', doc.createScalar(false));
        }

        const nextStep = steps.items[i + 1];
        const alreadyHasInstall = nextStep && isMap(nextStep) && 
          typeof nextStep.get('run') === 'string' && 
          nextStep.get('run').includes('pnpm install');

        if (!alreadyHasInstall) {
          const installStep = doc.createNode({
            name: 'Install dependencies',
            run: 'pnpm install'
          });
          steps.items.splice(i + 1, 0, installStep);
          i++;
        }
      }
    }
  });

  return doc.toString();
}