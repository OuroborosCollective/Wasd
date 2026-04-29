import { GitClient } from './git_client';
import { DependencyGraphBuilder } from './dependency_graph';
import { MutationController } from './mutation_controller';

async function main(): Promise<void> {
    const gitClient = new GitClient();
    const graphBuilder = new DependencyGraphBuilder();
    const mutationController = new MutationController();

    const LOOKBACK_HOURS = 46;
    const sinceDate = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);

    try {
        const files = await gitClient.getFilesChangedSince(sinceDate);
        
        if (files.length === 0) {
            process.exit(0);
        }

        const dependencyGraph = await graphBuilder.buildGraph(files);
        
        await mutationController.orchestrate(dependencyGraph);
    } catch (error) {
        process.stderr.write(error instanceof Error ? error.stack || error.message : String(error));
        process.exit(1);
    }
}

main();