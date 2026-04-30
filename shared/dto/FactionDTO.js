export class FactionDTO {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.color = data.color;
        this.startingResources = Object.freeze({ ...data.startingResources });
        this.traits = Object.freeze([...data.traits]);
        this.isPlayable = data.isPlayable;
        this.metadata = data.metadata ? Object.freeze({ ...data.metadata }) : undefined;
    }
    static create(data) {
        return new FactionDTO(data);
    }
    serialize() {
        return JSON.stringify({
            id: this.id,
            name: this.name,
            description: this.description,
            color: this.color,
            startingResources: this.startingResources,
            traits: this.traits,
            isPlayable: this.isPlayable,
            metadata: this.metadata
        });
    }
    static deserialize(json) {
        const parsed = JSON.parse(json);
        return new FactionDTO(parsed);
    }
    clone() {
        return new FactionDTO(this);
    }
}
export class FactionSummaryDTO {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.isPlayable = data.isPlayable;
    }
    static fromFullDTO(dto) {
        return new FactionSummaryDTO({
            id: dto.id,
            name: dto.name,
            isPlayable: dto.isPlayable
        });
    }
}
