export interface IFactionDTO {
    id: string;
    name: string;
    description: string;
    color: string;
    startingResources: Record<string, number>;
    traits: string[];
    isPlayable: boolean;
    metadata?: Record<string, unknown>;
}

export class FactionDTO implements IFactionDTO {
    public readonly id: string;
    public readonly name: string;
    public readonly description: string;
    public readonly color: string;
    public readonly startingResources: Record<string, number>;
    public readonly traits: string[];
    public readonly isPlayable: boolean;
    public readonly metadata?: Record<string, unknown>;

    constructor(data: IFactionDTO) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.color = data.color;
        this.startingResources = Object.freeze({ ...data.startingResources });
        this.traits = Object.freeze([...data.traits]) as unknown as string[];
        this.isPlayable = data.isPlayable;
        this.metadata = data.metadata ? Object.freeze({ ...data.metadata }) : undefined;
    }

    public static create(data: IFactionDTO): FactionDTO {
        return new FactionDTO(data);
    }

    public serialize(): string {
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

    public static deserialize(json: string): FactionDTO {
        const parsed = JSON.parse(json) as IFactionDTO;
        return new FactionDTO(parsed);
    }

    public clone(): FactionDTO {
        return new FactionDTO(this);
    }
}

export interface IFactionSummaryDTO {
    id: string;
    name: string;
    isPlayable: boolean;
}

export class FactionSummaryDTO implements IFactionSummaryDTO {
    public readonly id: string;
    public readonly name: string;
    public readonly isPlayable: boolean;

    constructor(data: IFactionSummaryDTO) {
        this.id = data.id;
        this.name = data.name;
        this.isPlayable = data.isPlayable;
    }

    public static fromFullDTO(dto: IFactionDTO): FactionSummaryDTO {
        return new FactionSummaryDTO({
            id: dto.id,
            name: dto.name,
            isPlayable: dto.isPlayable
        });
    }
}