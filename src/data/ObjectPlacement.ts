export enum SynergyType {
    Nature = "Nature",
    Arcane = "Arcane",
    Technical = "Technical"
}

export interface ObjectMetadata {
    id: string;
    displayName: string;
    supportedRituals: SynergyType[];
    influenceRadius: number;
}

export interface ObjectPlacement extends ObjectMetadata {
    position: {
        x: number;
        y: number;
        z: number;
    };
    rotation: number;
    scale: number;
}

export const OBJECT_TEMPLATES: Record<string, ObjectMetadata> = {
    "ancient_oak": {
        id: "ancient_oak",
        displayName: "Alter Eichenbaum",
        supportedRituals: [SynergyType.Nature],
        influenceRadius: 10
    },
    "mana_pylon": {
        id: "mana_pylon",
        displayName: "Mana-Pylon",
        supportedRituals: [SynergyType.Arcane, SynergyType.Technical],
        influenceRadius: 15
    },
    "druid_stone": {
        id: "druid_stone",
        displayName: "Druidenstein",
        supportedRituals: [SynergyType.Nature, SynergyType.Arcane],
        influenceRadius: 8
    },
    "steam_core": {
        id: "steam_core",
        displayName: "Dampfkern-Generator",
        supportedRituals: [SynergyType.Technical],
        influenceRadius: 12
    },
    "void_forge": {
        id: "void_forge",
        displayName: "Leeren-Schmiede",
        supportedRituals: [SynergyType.Arcane, SynergyType.Technical],
        influenceRadius: 20
    }
};

export class ObjectPlacementRegistry {
    private activePlacements: ObjectPlacement[] = [];

    public placeObject(
        templateId: string, 
        pos: { x: number, y: number, z: number }, 
        rot: number = 0, 
        scale: number = 1
    ): ObjectPlacement {
        const template = OBJECT_TEMPLATES[templateId];
        if (!template) {
            throw new Error(`Template with ID ${templateId} not found.`);
        }

        const newPlacement: ObjectPlacement = {
            ...template,
            position: pos,
            rotation: rot,
            scale: scale
        };

        this.activePlacements.push(newPlacement);
        return newPlacement;
    }

    public getPlacementsForSynergy(type: SynergyType): ObjectPlacement[] {
        return this.activePlacements.filter(obj => obj.supportedRituals.includes(type));
    }

    public getAllPlacements(): ObjectPlacement[] {
        return [...this.activePlacements];
    }

    public clearPlacements(): void {
        this.activePlacements = [];
    }
}

export const globalObjectRegistry = new ObjectPlacementRegistry();