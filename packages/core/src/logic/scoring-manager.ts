import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';

export interface ScoringTask {
    id: string;
    data: any;
    weight: number;
}

export interface ScoreReport {
    id: string;
    score: number;
}

export class ScoringManager {
    private workers: Worker[] = [];
    private sharedBuffer: SharedArrayBuffer;
    private scoreArray: Float32Array;
    private statusArray: Int32Array;
    private readonly numWorkers: number;
    private readonly dataSize: number;

    constructor(dataSize: number = 10000) {
        this.dataSize = dataSize;
        this.numWorkers = availableParallelism();
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
                    for (let i = start; i < end; i++) {
                        let score = scores[i];
                        score = (score * 0.95) + (Math.random() * 0.1); 
                        scores[i] = score;
                    }
                    Atomics.add(status, 1, 1);
                    if (Atomics.load(status, 1) === numWorkers) {
                        Atomics.store(status, 0, 0);
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

    public async updateScores(): Promise<void> {
        return new Promise((resolve) => {
            Atomics.store(this.statusArray, 1, 0);
            let completed = 0;
            const onMessage = (msg: string) => {
                if (msg === 'DONE') {
                    completed++;
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

    public async evaluateParallel(tasks: ScoringTask[]): Promise<ScoreReport[]> {
        await this.updateScores();
        return tasks.map((task, index) => ({
            id: task.id,
            score: this.getScore(index % this.dataSize) * task.weight
        }));
    }

    public setScore(index: number, value: number): void {
        if (index >= 0 && index < this.dataSize) {
            this.scoreArray[index] = value;
        }
    }

    public getScore(index: number): number {
        if (index >= 0 && index < this.dataSize) {
            return this.scoreArray[index];
        }
        return 0;
    }

    public getAllScores(): Float32Array {
        return this.scoreArray;
    }

    public terminate(): void {
        this.workers.forEach(worker => worker.terminate());
    }

    public async dispose(): Promise<void> {
        this.terminate();
    }
}

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
                scores[i] += Math.sin(i) * 0.01;
            }
            Atomics.add(status, 1, 1);
            parentPort?.postMessage('DONE');
        }
    });
}
