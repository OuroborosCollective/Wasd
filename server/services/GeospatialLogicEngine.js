class GeospatialLogicEngine {
    constructor(spatialIndex) {
        this.spatialIndex = spatialIndex;
        this.gates = new Map();
        this.inputBuffer = new Map();
        this.stateRegistry = new Map();
        this.propagationQueue = [];
    }

    registerGate(config) {
        const { id, type, inputs, outputs, persistence = false } = config;
        this.gates.set(id, {
            id,
            type: type.toUpperCase(),
            inputs,
            outputs,
            persistence,
            lastState: null
        });
        
        inputs.forEach(inputId => {
            if (!this.stateRegistry.has(inputId)) {
                this.stateRegistry.set(inputId, false);
            }
        });
    }

    processGPSEvent(userId, latitude, longitude, accuracy) {
        const nearbyTriggers = this.spatialIndex.queryRadius(latitude, longitude, accuracy || 10);
        
        nearbyTriggers.forEach(trigger => {
            if (trigger.type === 'GPS_ZONE') {
                const isInside = this.calculateDistance(latitude, longitude, trigger.lat, trigger.lng) <= trigger.radius;
                this.updateInputState(trigger.id, isInside);
            }
        });
    }

    processRaycastHit(hitData) {
        const { targetId, userId, timestamp, force } = hitData;
        
        if (this.stateRegistry.has(targetId)) {
            this.updateInputState(targetId, true);
            
            setTimeout(() => {
                this.updateInputState(targetId, false);
            }, 500);
        }
    }

    updateInputState(inputId, value) {
        const currentState = this.stateRegistry.get(inputId);
        if (currentState !== value) {
            this.stateRegistry.set(inputId, value);
            this.evaluateEngine();
        }
    }

    evaluateEngine() {
        let stable = false;
        let iterations = 0;
        const MAX_ITERATIONS = 32;

        while (!stable && iterations < MAX_ITERATIONS) {
            stable = true;
            iterations++;

            for (const [gateId, gate] of this.gates) {
                const newState = this.computeGateLogic(gate);
                
                if (newState !== gate.lastState) {
                    gate.lastState = newState;
                    stable = false;
                    this.propagateGateChange(gateId, newState);
                }
            }
        }
    }

    computeGateLogic(gate) {
        const inputValues = gate.inputs.map(id => {
            if (this.gates.has(id)) {
                return this.gates.get(id).lastState;
            }
            return this.stateRegistry.get(id) || false;
        });

        switch (gate.type) {
            case 'AND':
                return inputValues.length > 0 && inputValues.every(v => v === true);
            case 'OR':
                return inputValues.some(v => v === true);
            case 'NOT':
                return !inputValues[0];
            case 'XOR':
                return inputValues.filter(v => v === true).length % 2 !== 0;
            case 'NAND':
                return !(inputValues.length > 0 && inputValues.every(v => v === true));
            default:
                return false;
        }
    }

    propagateGateChange(gateId, state) {
        const gate = this.gates.get(gateId);
        if (!gate || !gate.outputs) return;

        gate.outputs.forEach(output => {
            if (output.type === 'WORLD_EVENT') {
                this.triggerWorldAction(output.action, state, output.params);
            } else if (output.type === 'AR_VISUAL') {
                this.updateARComponent(output.componentId, state);
            }
        });
    }

    triggerWorldAction(action, state, params) {
        const event = {
            timestamp: Date.now(),
            action,
            state,
            params
        };
        
        if (typeof this.onWorldTrigger === 'function') {
            this.onWorldTrigger(event);
        }
    }

    updateARComponent(componentId, state) {
        const update = {
            id: componentId,
            visible: state,
            active: state,
            timestamp: Date.now()
        };

        if (typeof this.onARUpdate === 'function') {
            this.onARUpdate(update);
        }
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3;
        const phi1 = lat1 * Math.PI / 180;
        const phi2 = lat2 * Math.PI / 180;
        const deltaPhi = (lat2 - lat1) * Math.PI / 180;
        const deltaLambda = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                  Math.cos(phi1) * Math.cos(phi2) *
                  Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    setWorldTriggerCallback(fn) {
        this.onWorldTrigger = fn;
    }

    setARUpdateCallback(fn) {
        this.onARUpdate = fn;
    }

    getGateStates() {
        const states = {};
        for (const [id, gate] of this.gates) {
            states[id] = gate.lastState;
        }
        return states;
    }
}

module.exports = GeospatialLogicEngine;