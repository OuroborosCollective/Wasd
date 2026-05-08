import { EventEmitter } from 'eventemitter3';

export interface TensionUpdate {
    normalizedValue: number;
}

export class TraitResonanceEngine extends EventEmitter {
    constructor() {
        super();
    }
}
