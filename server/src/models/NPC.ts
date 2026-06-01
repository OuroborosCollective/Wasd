export interface INPC {
    id: string;
    name: string;
    beliefs: string[];
}

export class NPC implements INPC {
    public id: string;
    public name: string;
    public beliefs: string[];
    public tags?: string[];

    constructor(id: string, name: string, beliefs: string[] = []) {
        this.id = id;
        this.name = name;
        this.beliefs = beliefs;
    }

    public addBelief(legendId: string): void {
        if (!this.beliefs.includes(legendId)) {
            this.beliefs.push(legendId);
        }
    }

    public hasBelief(legendId: string): boolean {
        return this.beliefs.includes(legendId);
    }

    public compareBeliefs(otherBeliefs: string[]): string[] {
        return this.beliefs.filter(beliefId => otherBeliefs.includes(beliefId));
    }

    public matchesBeliefs(legendIds: string[]): boolean {
        return legendIds.every(id => this.beliefs.includes(id));
    }

    public removeBelief(legendId: string): void {
        this.beliefs = this.beliefs.filter(id => id !== legendId);
    }
}