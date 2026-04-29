export type LogicValue = number | string | boolean | null;

export interface LogicCell {
    type: string;
    state: LogicValue;
    attributes: Record<string, any>;
}

export type LogicGrid = LogicCell[][];

export interface RuleContext {
    x: number;
    y: number;
    width: number;
    height: number;
    iteration: number;
}

export interface LogicRule {
    name: string;
    priority: number;
    selector: (cell: LogicCell) => boolean;
    apply: (cell: LogicCell, neighbors: LogicCell[], context: RuleContext) => LogicCell;
}

export class LogicGridCompiler {
    private iteration: number = 0;

    /**
     * Führt eine deterministische Transformation des Grids basierend auf den bereitgestellten Regeln durch.
     * Implementiert das Prinzip des Stateless Determinism: Gleicher Input + Gleiche Regeln = Gleicher Output.
     */
    public compile(currentGrid: LogicGrid, rules: LogicRule[]): LogicGrid {
        if (!currentGrid || currentGrid.length === 0) return [];

        const height = currentGrid.length;
        const width = currentGrid[0].length;
        const nextGrid: LogicGrid = Array.from({ length: height }, () => new Array(width));
        
        // Sortiere Regeln nach Priorität für deterministische Abfolge innerhalb eines Ticks
        const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const currentCell = currentGrid[y][x];
                const neighbors = this.getNeighbors(currentGrid, x, y, width, height);
                const context: RuleContext = { 
                    x, 
                    y, 
                    width, 
                    height, 
                    iteration: this.iteration 
                };
                
                // Deep Copy der Zelle für die Transformation
                let nextCell: LogicCell = { 
                    type: currentCell.type, 
                    state: currentCell.state, 
                    attributes: { ...currentCell.attributes } 
                };

                // Wende alle zutreffenden Regeln sequenziell an
                for (const rule of sortedRules) {
                    if (rule.selector(nextCell)) {
                        nextCell = rule.apply(nextCell, neighbors, context);
                    }
                }
                
                nextGrid[y][x] = nextCell;
            }
        }

        this.iteration++;
        return nextGrid;
    }

    /**
     * Ermittelt die Moore-Nachbarschaft (8 Richtungen) einer Zelle.
     */
    private getNeighbors(grid: LogicGrid, x: number, y: number, width: number, height: number): LogicCell[] {
        const neighbors: LogicCell[] = [];
        
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    neighbors.push(grid[ny][nx]);
                }
            }
        }
        
        return neighbors;
    }

    /**
     * Initialisiert ein neues Grid mit Standardwerten.
     */
    public seed(width: number, height: number, defaultType: string = 'void'): LogicGrid {
        this.iteration = 0;
        return Array.from({ length: height }, () => 
            Array.from({ length: width }, () => ({
                type: defaultType,
                state: 0,
                attributes: {}
            }))
        );
    }

    /**
     * Setzt den internen Iterationszähler zurück.
     */
    public reset(): void {
        this.iteration = 0;
    }

    /**
     * Gibt die aktuelle Iterationsnummer zurück.
     */
    public getIteration(): number {
        return this.iteration;
    }

    /**
     * Statische Hilfsmethode zur Validierung der Grid-Integrität.
     */
    public static checksum(grid: LogicGrid): string {
        let hash = 0;
        const s = JSON.stringify(grid);
        for (let i = 0; i < s.length; i++) {
            const char = s.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }
}