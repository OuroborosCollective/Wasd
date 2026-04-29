import { AnalysisEngine } from './analysis_engine';
import { DependencyGraph } from './dependency_graph';

export class MutationController {
    private fileQueue: string[];
    private engine: AnalysisEngine;
    private dependencyGraph: DependencyGraph;

    constructor(initialFiles: string[], engine: AnalysisEngine, dependencyGraph: DependencyGraph) {
        this.fileQueue = [...initialFiles];
        this.engine = engine;
        this.dependencyGraph = dependencyGraph;
    }

    /**
     * Führt den Restart-on-Mutation-Algorithmus aus.
     * Terminiert erst, wenn alle Dateien in der Queue ohne Mutation verarbeitet wurden.
     */
    public async run(): Promise<void> {
        let currentIndex = 0;

        while (currentIndex < this.fileQueue.length) {
            const currentFile = this.fileQueue[currentIndex];
            
            const mutationOccurred = await this.engine.applyFix(currentFile);

            if (mutationOccurred) {
                // Bei Mutation: Fortschritt zurücksetzen
                this.refreshQueue();
                currentIndex = 0;
            } else {
                // Keine Mutation: Nächste Datei
                currentIndex++;
            }
        }
    }

    /**
     * Aktualisiert den Dependency-Graphen und die Liste der Ziel-Dateien.
     */
    private refreshQueue(): void {
        this.fileQueue = this.dependencyGraph.update();
    }
}