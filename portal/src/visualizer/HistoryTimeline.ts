export interface WorldEvent {
    id: string;
    timestamp: number;
    type: 'war' | 'foundation' | 'disaster' | 'peace' | 'discovery' | 'other';
    intensity: number;
    label: string;
    coordinates: [number, number, number];
    metadata: Record<string, any>;
}

export interface WorldHistory {
    events: WorldEvent[];
    metadata: {
        startTime: number;
        endTime: number;
        version: string;
    };
}

export interface WebGLTimelinePoint {
    position: Float32Array; // [x, y, z]
    time: number;
    intensity: number;
    typeIndex: number;
}

export interface CameraKeyframe {
    time: number;
    position: [number, number, number];
    lookAt: [number, number, number];
    easing: string;
}

export interface ProcessedTimelineData {
    buffer: Float32Array;
    keyframes: CameraKeyframe[];
    eventCount: number;
}

export class HistoryTimelineProcessor {
    private static readonly INTENSITY_THRESHOLD = 0.75;
    private static readonly HIGH_INTENSITY_TYPES = ['war', 'foundation', 'disaster'];

    public static process(history: WorldHistory): ProcessedTimelineData {
        const filteredEvents = history.events.filter(event => 
            this.HIGH_INTENSITY_TYPES.includes(event.type) || 
            event.intensity >= this.INTENSITY_THRESHOLD
        ).sort((a, b) => a.timestamp - b.timestamp);

        const eventCount = filteredEvents.length;
        const buffer = new Float32Array(eventCount * 8); // pos(3), time(1), intensity(1), type(1), padding(2)

        const keyframes: CameraKeyframe[] = [];

        for (let i = 0; i < eventCount; i++) {
            const event = filteredEvents[i];
            const offset = i * 8;

            // WebGL Attribute Data
            buffer[offset] = event.coordinates[0];
            buffer[offset + 1] = event.coordinates[1];
            buffer[offset + 2] = event.coordinates[2];
            buffer[offset + 3] = event.timestamp;
            buffer[offset + 4] = event.intensity;
            buffer[offset + 5] = this.getTypeMapping(event.type);
            buffer[offset + 6] = 0.0; // reserved
            buffer[offset + 7] = 0.0; // reserved

            // Camera Interpolation Keyframe
            keyframes.push(this.createKeyframe(event));
        }

        return {
            buffer,
            keyframes,
            eventCount
        };
    }

    private static getTypeMapping(type: string): number {
        const mappings: Record<string, number> = {
            'war': 1.0,
            'foundation': 2.0,
            'disaster': 3.0,
            'peace': 4.0,
            'discovery': 5.0,
            'other': 0.0
        };
        return mappings[type] || 0.0;
    }

    private static createKeyframe(event: WorldEvent): CameraKeyframe {
        const distanceFactor = 1.0 + (1.0 - event.intensity);
        return {
            time: event.timestamp,
            position: [
                event.coordinates[0] * distanceFactor,
                event.coordinates[1] * distanceFactor,
                event.coordinates[2] + (50 * distanceFactor)
            ],
            lookAt: [
                event.coordinates[0],
                event.coordinates[1],
                event.coordinates[2]
            ],
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        };
    }

    public static interpolateCamera(
        currentTime: number, 
        keyframes: CameraKeyframe[]
    ): { position: [number, number, number], lookAt: [number, number, number] } {
        if (keyframes.length === 0) return { position: [0,0,0], lookAt: [0,0,0] };
        
        let nextIdx = keyframes.findIndex(kf => kf.time > currentTime);
        if (nextIdx === -1) return { 
            position: keyframes[keyframes.length - 1].position, 
            lookAt: keyframes[keyframes.length - 1].lookAt 
        };
        if (nextIdx === 0) return { 
            position: keyframes[0].position, 
            lookAt: keyframes[0].lookAt 
        };

        const prev = keyframes[nextIdx - 1];
        const next = keyframes[nextIdx];
        const alpha = (currentTime - prev.time) / (next.time - prev.time);

        return {
            position: [
                this.lerp(prev.position[0], next.position[0], alpha),
                this.lerp(prev.position[1], next.position[1], alpha),
                this.lerp(prev.position[2], next.position[2], alpha)
            ],
            lookAt: [
                this.lerp(prev.lookAt[0], next.lookAt[0], alpha),
                this.lerp(prev.lookAt[1], next.lookAt[1], alpha),
                this.lerp(prev.lookAt[2], next.lookAt[2], alpha)
            ]
        };
    }

    private static lerp(start: number, end: number, t: number): number {
        return start * (1 - t) + end * t;
    }
}