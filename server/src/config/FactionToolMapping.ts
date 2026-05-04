// @ts-nocheck
export interface FactionToolConfig {
    [factionId: string]: {
        [role: string]: string;
    };
}

export const FACTION_TOOL_MAP: FactionToolConfig = {
    "police": {
        "cadet": "assets/models/tools/police/baton_basic.glb",
        "officer": "assets/models/tools/police/baton_advanced.glb",
        "sergeant": "assets/models/tools/police/handcuffs_steel.glb",
        "chief": "assets/models/tools/police/radio_high_end.glb"
    },
    "medic": {
        "intern": "assets/models/tools/medic/first_aid_kit.glb",
        "paramedic": "assets/models/tools/medic/defibrillator.glb",
        "surgeon": "assets/models/tools/medic/scalpel.glb"
    },
    "mechanic": {
        "apprentice": "assets/models/tools/mechanic/wrench.glb",
        "journeyman": "assets/models/tools/mechanic/welding_torch.glb",
        "master": "assets/models/tools/mechanic/power_drill.glb"
    },
    "neutral": {
        "citizen": "assets/models/tools/generic/smartphone.glb",
        "delivery": "assets/models/tools/generic/clipboard.glb"
    }
};