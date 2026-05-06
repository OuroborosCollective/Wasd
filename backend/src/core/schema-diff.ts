export interface SchemaDiffResult {
    missingColumns: string[];
    typeMismatches: string[];
    extraColumns: string[];
}

export class SchemaDiff {
    public static compare(expected: any, actual: any): SchemaDiffResult {
        const result: SchemaDiffResult = {
            missingColumns: [],
            typeMismatches: [],
            extraColumns: []
        };

        const expectedCols = new Map(expected.properties.map((p: any) => [p.name, p]));
        const actualCols = new Map(actual.columns.map((c: any) => [c.name, c]));

        expectedCols.forEach((val, key) => {
            if (!actualCols.has(key)) {
                result.missingColumns.push(key);
            } else {
                const actualCol = actualCols.get(key);
                if (val.type !== actualCol.type) {
                    result.typeMismatches.push(`${key}: expected ${val.type}, got ${actualCol.type}`);
                }
            }
        });

        actualCols.forEach((val, key) => {
            if (!expectedCols.has(key)) {
                result.extraColumns.push(key);
            }
        });

        return result;
    }
}
