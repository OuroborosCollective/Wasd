import { parentPort, workerData } from 'node:worker_threads';
import Redis from 'ioredis';

/**
 * Spatial Hub Worker for high-frequency Redis synchronization.
 * Optimized for low-latency WASD and transform data propagation.
 */

if (!parentPort) {
    throw new Error('This module must be started as a Worker Thread.');
}

// Extract configuration from workerData
const { 
    redisUri = 'redis://localhost:6379', 
    channel = 'spatial:hub:sync', 
    nodeId = `node_${Math.random().toString(36).substring(2, 15)}` 
} = workerData || {};

// Dedicated Redis clients for Pub and Sub to avoid blocking
const pub = new Redis(redisUri, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    connectTimeout: 10000,
});

const sub = new Redis(redisUri, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    connectTimeout: 10000,
});

/**
 * Error reporting back to the main thread
 */
const reportError = (err: Error | string) => {
    parentPort?.postMessage({
        type: 'HUB_ERROR',
        payload: {
            message: typeof err === 'string' ? err : err.message,
            nodeId
        }
    });
};

pub.on('error', reportError);
sub.on('error', reportError);

/**
 * Subscribe to the spatial sync channel
 */
sub.subscribe(channel, (err) => {
    if (err) {
        reportError(`Failed to subscribe to ${channel}: ${err.message}`);
    }
});

/**
 * Inbound Redis messages -> Send to Main Thread
 */
sub.on('message', (incomingChannel, message) => {
    if (incomingChannel === channel) {
        try {
            const envelope = JSON.parse(message);
            
            // Filter out messages originating from this node to prevent loops
            if (envelope.origin !== nodeId) {
                parentPort?.postMessage({
                    type: 'SPATIAL_UPDATE_INBOUND',
                    payload: envelope
                });
            }
        } catch (e) {
            // Drop malformed packets for low latency stability
        }
    }
});

/**
 * Outbound Main Thread messages -> Publish to Redis
 */
parentPort.on('message', (msg) => {
    if (msg.type === 'SPATIAL_UPDATE_OUTBOUND') {
        try {
            const payload = JSON.stringify({
                origin: nodeId,
                timestamp: Date.now(),
                ...msg.payload
            });
            
            pub.publish(channel, payload);
        } catch (e) {
            // Serialization failed
        }
    }
});

/**
 * Lifecycle management
 */
process.on('SIGTERM', () => {
    pub.disconnect();
    sub.disconnect();
});

// Signal readiness to main thread
parentPort.postMessage({ type: 'HUB_READY', nodeId });