import { describe, it, expect } from 'vitest';

/**
 * Mocking a WorkflowTransformer for the purpose of the test suite.
 * Implementation follows the requirements: 
 * 1. Adds 'run_install: false' to the target step.
 * 2. Inserts a new step at the exact following index.
 * 3. Preserves all existing metadata.
 */
class WorkflowTransformer {
    transform(workflow: any): any {
        const newWorkflow = JSON.parse(JSON.stringify(workflow));
        for (const jobId in newWorkflow.jobs) {
            const job = newWorkflow.jobs[jobId];
            if (job.steps) {
                const targetIndex = job.steps.findIndex((s: any) => s.uses && s.uses.includes('actions/checkout'));
                if (targetIndex !== -1) {
                    // Requirement 1 & 2: Handle 'with' and add 'run_install: false'
                    if (!job.steps[targetIndex].with) {
                        job.steps[targetIndex].with = {};
                    }
                    job.steps[targetIndex].with.run_install = false;

                    // Requirement 3: Insert new step at exact following position
                    const newStep = {
                        name: 'Post-Checkout Hook',
                        run: 'echo "Step added"'
                    };
                    job.steps.splice(targetIndex + 1, 0, newStep);
                }
            }
        }
        return newWorkflow;
    }
}

describe('WorkflowTransformer', () => {
    const transformer = new WorkflowTransformer();

    it('should add "run_install: false" when "with" block is missing', () => {
        const input = {
            jobs: {
                build: {
                    steps: [
                        { name: 'Checkout', uses: 'actions/checkout@v4' }
                    ]
                }
            }
        };

        const result = transformer.transform(input);
        const targetStep = result.jobs.build.steps[0];

        expect(targetStep.with).toBeDefined();
        expect(targetStep.with.run_install).toBe(false);
    });

    it('should preserve other parameters in "with" block while adding "run_install: false"', () => {
        const input = {
            jobs: {
                build: {
                    steps: [
                        {
                            name: 'Checkout',
                            uses: 'actions/checkout@v4',
                            with: {
                                repository: 'my/repo',
                                fetch_depth: 0
                            }
                        }
                    ]
                }
            }
        };

        const result = transformer.transform(input);
        const targetStep = result.jobs.build.steps[0];

        expect(targetStep.with.repository).toBe('my/repo');
        expect(targetStep.with.fetch_depth).toBe(0);
        expect(targetStep.with.run_install).toBe(false);
    });

    it('should insert new step at the exact following index and preserve metadata', () => {
        const input = {
            jobs: {
                deploy: {
                    steps: [
                        {
                            id: 'checkout-step',
                            name: 'Checkout Source',
                            uses: 'actions/checkout@v4',
                            env: { DEBUG: 'true' }
                        },
                        {
                            id: 'existing-next',
                            name: 'Next Step',
                            run: 'npm test'
                        }
                    ]
                }
            }
        };

        const result = transformer.transform(input);
        const steps = result.jobs.deploy.steps;

        // Verify metadata preservation on original step
        expect(steps[0].id).toBe('checkout-step');
        expect(steps[0].env.DEBUG).toBe('true');
        expect(steps[0].with.run_install).toBe(false);

        // Verify new step position (Index 1)
        expect(steps[1].name).toBe('Post-Checkout Hook');

        // Verify original next step shifted to Index 2
        expect(steps[2].id).toBe('existing-next');
        expect(steps.length).toBe(3);
    });
});