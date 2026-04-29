export interface AREEntity {
    id: string;
    [key: string]: any;
}

export interface AREPlayer {
    id: string;
    health: number;
    mana: number;
    hand: AREEntity[];
    field: AREEntity[];
    graveyard: AREEntity[];
    deckCount: number;
}

export interface AREGameState {
    players: AREPlayer[];
    activePlayerId: string;
    turn: number;
}

export class AREStateCompiler {
    public static compile(state: AREGameState): string {
        let chain = `T:${state.turn};AP:${state.activePlayerId};`;

        const sortedPlayers = [...state.players].sort((a, b) => a.id.localeCompare(b.id));

        for (const p of sortedPlayers) {
            chain += `P:${p.id}{H:${p.health},M:${p.mana},DC:${p.deckCount},`;
            chain += `HD:[${this.serializeEntities(p.hand)}],`;
            chain += `FD:[${this.serializeEntities(p.field)}],`;
            chain += `GY:[${this.serializeEntities(p.graveyard)}]},`;
        }

        return chain;
    }

    private static serializeEntities(entities: AREEntity[]): string {
        return entities
            .slice()
            .sort((a, b) => a.id.localeCompare(b.id))
            .map(e => {
                const sortedKeys = Object.keys(e).sort();
                const props = sortedKeys
                    .map(k => `${k}:${JSON.stringify(this.sortDeep(e[k]))}`)
                    .join('|');
                return `{${props}}`;
            })
            .join(';');
    }

    private static sortDeep(val: any): any {
        if (val === null || typeof val !== 'object') {
            return val;
        }
        if (Array.isArray(val)) {
            return val.map(i => this.sortDeep(i));
        }
        const obj: any = {};
        Object.keys(val)
            .sort()
            .forEach(k => {
                obj[k] = this.sortDeep(val[k]);
            });
        return obj;
    }
}