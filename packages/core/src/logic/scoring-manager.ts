import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';

/**
 * ScoringManager handles high-performance score calculations using Worker Threads
 * and SharedArrayBuffer for zero-copy data sharing.
 * This implementation achieves near-native performance by avoiding GC and serialization overhead.
 */
export class ScoringManager {
    private workers: Worker[] = [];
    private sharedBuffer: SharedArrayBuffer;
    private scoreArray: Float32Array;
    private statusArray: Int32Array;
    private readonly numWorkers: number;
    private readonly dataSize: number;

    /**
     * @param dataSize Number of entities to track scores for
     */
    constructor(dataSize: number = 10000) {
        this.dataSize = dataSize;
        this.numWorkers = availableParallelism();

        // Buffer for scores (Float32) and a status buffer for synchronization
        // statusArray[0] = task signal, statusArray[1] = workers completed count
        this.sharedBuffer = new SharedArrayBuffer(dataSize * Float32Array.BYTES_PER_ELEMENT);
        this.scoreArray = new Float32Array(this.sharedBuffer);
        
        const controlBuffer = new SharedArrayBuffer(1024);
        this.statusArray = new Int32Array(controlBuffer);

        this.initWorkers();
    }

    private initWorkers(): void {
        const workerCode = `
            const { parentPort, workerData } = require('node:worker_threads');
            const { sharedBuffer, statusArray, workerId, numWorkers, dataSize } = workerData;
            
            const scores = new Float32Array(sharedBuffer);
            const status = new Int32Array(statusArray);
            
            const chunkSize = Math.ceil(dataSize / numWorkers);
            const start = workerId * chunkSize;
            const end = Math.min(start + chunkSize, dataSize);

            parentPort.on('message', (msg) => {
                if (msg === 'PROCESS') {
                    // High performance computation loop
                    for (let i = start; i < end; i++) {
                        // Example logic: complex scoring simulation
                        let score = scores[i];
                        score = (score * 0.95) + (Math.random() * 0.1); 
                        scores[i] = score;
                    }
                    
                    // Atomic increment to signal completion of this worker's chunk
                    Atomics.add(status, 1, 1);
                    if (Atomics.load(status, 1) === numWorkers) {
                        Atomics.store(status, 0, 0); // Reset task signal
                        parentPort.postMessage('DONE');
                    }
                }
            });
        `;

        for (let i = 0; i < this.numWorkers; i++) {
            const worker = new Worker(workerCode, {
                eval: true,
                workerData: {
                    sharedBuffer: this.sharedBuffer,
                    statusArray: this.statusArray.buffer,
                    workerId: i,
                    numWorkers: this.numWorkers,
                    dataSize: this.dataSize
                }
            });
            this.workers.push(worker);
        }
    }

    /**
     * Triggers a parallel scoring update across all workers.
     * Returns a promise that resolves when all workers have finished.
     */
    public async updateScores(): Promise<void> {
        return new Promise((resolve) => {
            Atomics.store(this.statusArray, 1, 0); // Reset completion counter
            
            let completed = 0;
            const onMessage = (msg: string) => {
                if (msg === 'DONE') {
                    completed++;
                    // We only need one 'DONE' signal if logic is handled correctly, 
                    // but we verify against worker count for safety.
                    if (completed === this.numWorkers) {
                        this.workers.forEach(w => w.off('message', onMessage));
                        resolve();
                    }
                }
            };

            this.workers.forEach(worker => {
                worker.on('message', onMessage);
                worker.postMessage('PROCESS');
            });
        });
    }

    public setScore(index: number, value: number): void {
        if (index >= 0 && index < this.dataSize) {
            Atomics.store(this.scoreArray, index, value);
        }
    }

    public getScore(index: number): number {
        return Atomics.load(this.scoreArray, index);
    }

    public getAllScores(): Float32Array {
        return this.scoreArray;
    }

    public terminate(): void {
        this.workers.forEach(worker => worker.terminate());
    }
}

// In-file Worker logic handler for self-containment if executed as worker
if (!isMainThread) {
    const { sharedBuffer, statusArray, workerId, numWorkers, dataSize } = workerData;
    const scores = new Float32Array(sharedBuffer);
    const status = new Int32Array(statusArray);
    const chunkSize = Math.ceil(dataSize / numWorkers);
    const start = workerId * chunkSize;
    const end = Math.min(start + chunkSize, dataSize);

    parentPort?.on('message', (msg) => {
        if (msg === 'PROCESS') {
            for (let i = start; i < end; i++) {
                // Intensive calculation
                scores[i] += Math.sin(i) * 0.01;
            }
            Atomics.add(status, 1, 1);
            parentPort?.postMessage('DONE');
        }
    });
}