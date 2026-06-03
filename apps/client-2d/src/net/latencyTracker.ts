export interface LatencySample {
  sentAtMs: number;
  receivedAtMs: number;
  rttMs: number;
}

export interface LatencyTracker {
  markPing(sentAtMs: number): void;
  markPong(sentAtMs: number, receivedAtMs: number): void;
  getRttMs(): number;
  getSampleCount(): number;
  getQuality(): "offline" | "poor" | "ok" | "good";
}

export function createLatencyTracker(maxSamples = 16): LatencyTracker {
  const pending = new Set<number>();
  const samples: LatencySample[] = [];

  return {
    markPing(sentAtMs) {
      pending.add(sentAtMs);
    },

    markPong(sentAtMs, receivedAtMs) {
      if (!pending.has(sentAtMs)) return;

      pending.delete(sentAtMs);

      samples.push({
        sentAtMs,
        receivedAtMs,
        rttMs: Math.max(0, receivedAtMs - sentAtMs)
      });

      while (samples.length > maxSamples) {
        samples.shift();
      }
    },

    getRttMs() {
      if (samples.length === 0) return 0;

      const sum = samples.reduce((acc, sample) => acc + sample.rttMs, 0);
      return Math.round(sum / samples.length);
    },

    getSampleCount() {
      return samples.length;
    },

    getQuality() {
      if (samples.length === 0) return "offline";

      const rtt = this.getRttMs();

      if (rtt < 90) return "good";
      if (rtt < 180) return "ok";
      return "poor";
    }
  };
}