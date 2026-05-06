export interface Column {
    name: string;
    type: string;
    nullable: boolean;
}

export interface SchemaDiffResult {
    additions: Column[];
    removals: string[];
    changes: { name: string, from: string, to: string }[];
}

export class SchemaDiff {
    /**
     * Vergleicht das erwartete Modell-Schema mit dem tatsächlichen DB-Schema.
     */
    public static compare(expected: { properties: Column[] }, actual: { columns: Column[] }): SchemaDiffResult {
        const result: SchemaDiffResult = {
            additions: [],
            removals: [],
            changes: []
        };

        const expectedMap = new Map(expected.properties.map(p => [p.name, p]));
        const actualMap = new Map(actual.columns.map(c => [c.name, c]));

        // Check for additions and changes
        expectedMap.forEach((expectedCol, name) => {
            const actualCol = actualMap.get(name);
            if (!actualCol) {
                result.additions.push(expectedCol);
            } else {
                if (this.normalizeType(expectedCol.type) !== this.normalizeType(actualCol.type)) {
                    result.changes.push({
                        name,
                        from: actualCol.type,
                        to: expectedCol.type
                    });
                }
            }
        });

        // Check for removals
        actualMap.forEach((_, name) => {
            if (!expectedMap.has(name)) {
                result.removals.push(name);
            }
        });

        return result;
    }

    private static normalizeType(type: string): string {
        return type.toLowerCase().split('(')[0].trim();
    }
}
