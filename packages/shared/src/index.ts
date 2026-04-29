export type FixedPoint = number;

export interface Weather {
    temperature: FixedPoint;
    humidity: FixedPoint;
    pressure: FixedPoint;
    windSpeed: FixedPoint;
    timestamp: number;
}

export interface AREState {
    weather: Weather;
    id: string;
    status: 'idle' | 'running' | 'error';
    lastUpdate: number;
}

export class AREStateCompiler {
    public static compile(state: AREState): string {
        return JSON.stringify({
            t: state.weather.temperature,
            h: state.weather.humidity,
            p: state.weather.pressure,
            w: state.weather.windSpeed,
            ts: state.weather.timestamp,
            s: state.status,
            i: state.id
        });
    }

    public static parse(payload: string): AREState {
        const data = JSON.parse(payload);
        return {
            weather: {
                temperature: data.t as FixedPoint,
                humidity: data.h as FixedPoint,
                pressure: data.p as FixedPoint,
                windSpeed: data.w as FixedPoint,
                timestamp: data.ts
            },
            status: data.s,
            id: data.i,
            lastUpdate: Date.now()
        };
    }

    public validate(state: AREState): boolean {
        return (
            typeof state.weather.temperature === 'number' &&
            typeof state.weather.humidity === 'number' &&
            state.id !== undefined
        );
    }
}