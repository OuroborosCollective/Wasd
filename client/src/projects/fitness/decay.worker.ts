interface DecayState {
    health: number;
    decayRate: number;
    weight: number;
}

let intervalId: ReturnType<typeof setInterval> | null = null;
let currentState: DecayState = {
    health: 100,
    decayRate: 0.01,
    weight: 70
};

self.onmessage = (event: MessageEvent) => {
    const { type, payload } = event.data;

    switch (type) {
        case 'START':
            if (payload) {
                currentState = { ...currentState, ...payload };
            }
            startDecay();
            break;
        case 'STOP':
            stopDecay();
            break;
        case 'UPDATE_PARAMS':
            currentState = { ...currentState, ...payload };
            break;
    }
};

function startDecay(): void {
    if (intervalId) clearInterval(intervalId);

    intervalId = setInterval(() => {
        const decayAmount = currentState.decayRate * currentState.weight;
        currentState.health = Math.max(0, currentState.health - decayAmount);

        self.postMessage({
            type: 'TICK',
            health: currentState.health
        });

        if (currentState.health <= 0) {
            stopDecay();
        }
    }, 1000);
}

function stopDecay(): void {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}