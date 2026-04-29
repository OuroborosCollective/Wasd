export interface AREState {
    id: string;
    code: string;
    metadata?: Record<string, any>;
}

export interface AREExecutionContext {
    variables: Map<string, any>;
    timestamp: number;
    target: any;
}

export class AREStateCompiler {
    private cache: Map<string, Function>;

    constructor() {
        this.cache = new Map();
    }

    public async compileAndExecute(state: AREState, context: AREExecutionContext): Promise<any> {
        try {
            let compiledFunction = this.cache.get(state.id);

            if (!compiledFunction) {
                compiledFunction = this.compile(state.code);
                this.cache.set(state.id, compiledFunction);
            }

            return await this.execute(compiledFunction, context);
        } catch (error) {
            console.error(`Execution failed for state ${state.id}:`, error);
            throw error;
        }
    }

    private compile(code: string): Function {
        try {
            return new Function('context', `"use strict"; return (async () => { ${code} })();`);
        } catch (error) {
            throw new Error(`Compilation error: ${error.message}`);
        }
    }

    private async execute(fn: Function, context: AREExecutionContext): Promise<any> {
        return fn(context);
    }

    public clearCache(): void {
        this.cache.clear();
    }
}

export class AREEngineBox {
    private compiler: AREStateCompiler;

    constructor() {
        this.compiler = new AREStateCompiler();
    }

    public getCompiler(): AREStateCompiler {
        return this.compiler;
    }
}