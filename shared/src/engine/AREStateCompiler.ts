export interface AREState {
  readonly data: Record<string, any>;
  readonly context: Record<string, any>;
  readonly version: number;
  readonly lastActionId: string | null;
  readonly lastUpdate: number;
}

export interface AREAction {
  readonly id: string;
  readonly type: string;
  readonly payload: any;
  readonly timestamp: number;
}

export interface ARERule {
  readonly id: string;
  readonly priority: number;
  readonly condition: (state: AREState, action: AREAction) => boolean;
  readonly apply: (state: AREState, action: AREAction) => AREState;
}

/**
 * AREStateCompiler handles state transitions in a functional, stateless manner.
 * Given the same state, action, and rules, it will always produce the same output.
 */
export class AREStateCompiler {
  /**
   * Compiles the next state based on the current state and a triggered action.
   * 
   * @param currentState The current immutable application state.
   * @param action The action object containing the payload and type.
   * @param rules The set of rules to be evaluated against the state and action.
   * @returns A new, frozen state object.
   */
  public static compile(
    currentState: AREState,
    action: AREAction,
    rules: ARERule[]
  ): AREState {
    // 1. Create a deep copy to ensure no side effects on the input state
    let evolvedState: AREState = this.deepClone(currentState);

    // 2. Sort rules by priority (descending) and ID (ascending) to ensure 
    // deterministic execution order regardless of input array order.
    const deterministicRules = [...rules].sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.id.localeCompare(b.id);
    });

    // 3. Iteratively apply rules that meet the condition
    for (const rule of deterministicRules) {
      if (rule.condition(evolvedState, action)) {
        evolvedState = rule.apply(evolvedState, action);
      }
    }

    // 4. Update metadata and return frozen state to prevent external mutations
    return Object.freeze({
      ...evolvedState,
      version: currentState.version + 1,
      lastActionId: action.id,
      lastUpdate: action.timestamp
    });
  }

  /**
   * Deep clones the state using JSON serialization to strip references.
   * In a production environment with complex objects (Dates, RegEx), 
   * a more sophisticated cloning mechanism should be used.
   */
  private static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    return JSON.parse(JSON.stringify(obj));
  }
}