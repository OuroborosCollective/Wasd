export type AREStateType = 'START' | 'END' | 'TASK' | 'DECISION' | 'WAIT' | 'EVENT';

/**
 * KAPPA_SCALE: Deterministic scaling factor for integer-based precision.
 * Formula: kappaPos = floor(floatValue * 1000 + 1e-9)
 */
const KAPPA_SCALE = 1000;
const KAPPA_EPSILON = 1e-9;
const MAX_METADATA_DEPTH = 10;

export interface AREState {
  id: string;
  type: AREStateType;
  name: string;
  metadata?: Record<string, any>;
  actions?: string[];
  kappaX?: number; // Raw float input, transformed to integer
  kappaY?: number; // Raw float input, transformed to integer
}

export interface ARETransition {
  id: string;
  from: string;
  to: string;
  condition?: string;
  priority: number; 
  trigger?: string;
  kappaWeight?: number; // Raw float input, transformed to integer
}

export interface AREGraph {
  id: string;
  version: string;
  states: AREState[];
  transitions: ARETransition[];
  initialStateId: string;
}

export interface ARECompilerError {
  severity: 'error' | 'warning';
  message: string;
  refId?: string;
}

export interface ARECompilerOutput {
  isValid: boolean;
  errors: ARECompilerError[];
  compiledData?: AREGraph;
}

/**
 * AREStateCompiler - Sovereign AAAA+ COMPILER
 * Strictly deterministic, O(1) complexity lookup, Stateless Logic.
 * Implements WakeUpShield integrity and kappaPos integer scaling.
 */
export class AREStateCompiler {
  /**
   * Compiles the graph using O(1) HashMaps and deterministic integer math.
   * Stateless: Returns new data, never mutates input.
   */
  public compile(graph: AREGraph): ARECompilerOutput {
    const errors: ARECompilerError[] = [];

    if (!graph || !Array.isArray(graph.states) || graph.states.length === 0) {
      errors.push({ severity: 'error', message: 'E_EMPTY_GRAPH' });
      return { isValid: false, errors };
    }

    // O(1) Lookup Maps
    const stateMap = new Map<string, AREState>();
    const transitionMap = new Map<string, ARETransition[]>();

    for (let i = 0; i < graph.states.length; i++) {
      stateMap.set(graph.states[i].id, graph.states[i]);
    }

    for (let i = 0; i < graph.transitions.length; i++) {
      const t = graph.transitions[i];
      if (!transitionMap.has(t.from)) {
        transitionMap.set(t.from, []);
      }
      transitionMap.get(t.from)!.push(t);
    }

    // Stateless validation logic
    this.validateInitialState(graph, stateMap, errors);
    this.validateTransitions(graph, stateMap, errors);
    this.validateNodeLogic(stateMap, transitionMap, errors);

    const isValid = !errors.some((e) => e.severity === 'error');

    return {
      isValid,
      errors,
      compiledData: isValid ? this.transform(graph) : undefined,
    };
  }

  private validateInitialState(
    graph: AREGraph,
    stateMap: Map<string, AREState>,
    errors: ARECompilerError[]
  ): void {
    if (!graph.initialStateId) {
      errors.push({ severity: 'error', message: 'E_MISSING_INIT_ID' });
      return;
    }

    const startState = stateMap.get(graph.initialStateId);
    if (!startState) {
      errors.push({ severity: 'error', message: 'E_INIT_NOT_FOUND', refId: graph.initialStateId });
    } else if (startState.type !== 'START') {
      // Sovereign requirement: Start node MUST be type START
      errors.push({ severity: 'error', message: 'E_INIT_TYPE_INVALID', refId: startState.id });
    }
  }

  private validateTransitions(
    graph: AREGraph,
    stateMap: Map<string, AREState>,
    errors: ARECompilerError[]
  ): void {
    const transitions = graph.transitions || [];
    for (let i = 0; i < transitions.length; i++) {
      const t = transitions[i];
      const fromState = stateMap.get(t.from);
      const toState = stateMap.get(t.to);

      if (!fromState) errors.push({ severity: 'error', message: 'E_FROM_VOID', refId: t.id });
      if (!toState) errors.push({ severity: 'error', message: 'E_TO_VOID', refId: t.id });

      if (fromState?.type === 'END') {
        errors.push({ severity: 'error', message: 'E_END_OUTGOING', refId: t.id });
      }

      if (typeof t.priority !== 'number') {
        errors.push({ severity: 'error', message: 'E_INVALID_PRIO', refId: t.id });
      }
    }
  }

  private validateNodeLogic(
    stateMap: Map<string, AREState>,
    transitionMap: Map<string, ARETransition[]>,
    errors: ARECompilerError[]
  ): void {
    let hasEnd = false;

    for (const state of stateMap.values()) {
      if (state.type === 'END') hasEnd = true;

      const outgoing = transitionMap.get(state.id) || [];

      if (state.type === 'DECISION') {
        if (outgoing.length === 0) {
          errors.push({ severity: 'error', message: 'E_DECISION_STUCK', refId: state.id });
        } else {
          let defaultPaths = 0;
          for (let i = 0; i < outgoing.length; i++) {
            const cond = outgoing[i].condition;
            if (cond === undefined || cond === null || cond === '') {
              defaultPaths++;
            }
          }
          if (defaultPaths > 1) {
            errors.push({ severity: 'error', message: 'E_DECISION_AMBIGUOUS_DEFAULT', refId: state.id });
          }
        }
      }

      if (state.type === 'TASK' && outgoing.length === 0) {
        errors.push({ severity: 'warning', message: 'W_TASK_LEAF', refId: state.id });
      }
    }

    if (!hasEnd) {
      errors.push({ severity: 'warning', message: 'W_NO_EXIT' });
    }
  }

  /**
   * Deterministic Transformation.
   * Maps everything to integers, handles nested metadata, and stable-sorts transitions.
   */
  private transform(graph: AREGraph): AREGraph {
    return {
      ...graph,
      states: graph.states.map((s) => ({
        ...s,
        kappaX: s.kappaX !== undefined ? AREStateCompiler.toKappa(s.kappaX) : undefined,
        kappaY: s.kappaY !== undefined ? AREStateCompiler.toKappa(s.kappaY) : undefined,
        metadata: this.transformMetadata(s.metadata, new Set(), 0),
      })),
      transitions: [...graph.transitions]
        .map((t) => ({
          ...t,
          priority: Math.floor(t.priority + KAPPA_EPSILON),
          kappaWeight: t.kappaWeight !== undefined ? AREStateCompiler.toKappa(t.kappaWeight) : undefined,
        }))
        .sort((a, b) => {
          const pDiff = b.priority - a.priority;
          if (pDiff !== 0) return pDiff;
          // Binary deterministic string comparison
          return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
        }),
    };
  }

  /**
   * Recursive metadata scaling with circular reference protection and array support.
   */
  private transformMetadata(
    val: any,
    seen: Set<any>,
    depth: number
  ): any {
    if (val === null || typeof val !== 'object' || depth > MAX_METADATA_DEPTH) {
      return typeof val === 'number' ? AREStateCompiler.toKappa(val) : val;
    }

    if (seen.has(val)) return undefined; // Protect against circularity
    seen.add(val);

    if (Array.isArray(val)) {
      const arr = [];
      for (let i = 0; i < val.length; i++) {
        arr.push(this.transformMetadata(val[i], seen, depth + 1));
      }
      return arr;
    }

    const result: Record<string, any> = {};
    const keys = Object.keys(val);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      result[key] = this.transformMetadata(val[key], seen, depth + 1);
    }
    return result;
  }

  /**
   * Universal Kappa Scaler.
   * Ensures deterministic integer representation of floating point values.
   */
  public static toKappa(val: number): number {
    if (typeof val !== 'number' || isNaN(val)) return 0;
    // Check if it's already an integer at the correct scale to prevent double scaling
    // But per mandate, we force-apply the formula to raw inputs
    return Math.floor(val * KAPPA_SCALE + KAPPA_EPSILON);
  }
}