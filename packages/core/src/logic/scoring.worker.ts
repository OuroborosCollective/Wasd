import { parentPort } from 'worker_threads';

/**
 * Scoring Worker for WASD Monorepo
 * Handles high-performance scoring calculations using SharedArrayBuffers.
 */

interface ScoringPayload {
  type: 'UPDATE_SCORE' | 'RESET' | 'COMPUTE_FINAL';
  buffer: SharedArrayBuffer;
  byteOffset: number;
  length: number;
  multiplier: number;
}

interface ScoringResult {
  totalScore: number;
  timestamp: number;
}

if (parentPort) {
  parentPort.on('message', (payload: ScoringPayload) => {
    const { type, buffer, byteOffset, length, multiplier } = payload;

    // Use Float32Array to read from the shared memory without copying
    const scoreData = new Float32Array(buffer, byteOffset, length);

    switch (type) {
      case 'UPDATE_SCORE': {
        let currentBatchTotal = 0;

        // Perform intensive calculations here
        // Example: Squared distance-based weight calculation
        for (let i = 0; i < scoreData.length; i++) {
          const val = scoreData[i];
          if (val > 0) {
            currentBatchTotal += (val * val) * multiplier;
          }
        }

        parentPort?.postMessage({
          totalScore: currentBatchTotal,
          timestamp: Date.now()
        } as ScoringResult);
        break;
      }

      case 'COMPUTE_FINAL': {
        let finalSum = 0;
        // Example logic for final aggregation with thresholding
        for (let i = 0; i < scoreData.length; i++) {
          if (scoreData[i] > 0.5) {
            finalSum += scoreData[i] * 1.5;
          } else {
            finalSum += scoreData[i] * 0.8;
          }
        }

        parentPort?.postMessage({
          totalScore: finalSum * multiplier,
          timestamp: Date.now()
        } as ScoringResult);
        break;
      }

      case 'RESET': {
        // Clear the shared buffer in-place
        scoreData.fill(0);
        parentPort?.postMessage({
          totalScore: 0,
          timestamp: Date.now()
        } as ScoringResult);
        break;
      }

      default:
        break;
    }
  });
}

// Error handling for the worker thread
process.on('uncaughtException', (err) => {
  console.error('Scoring Worker Uncaught Exception:', err);
});