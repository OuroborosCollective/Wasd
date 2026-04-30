export type AREStateType = 'START' | 'END' | 'TASK' | 'DECISION' | 'WAIT' | 'EVENT';

export interface AREState {
  id: string;
  type: AREStateType;
  name: string;
  metadata?: Record<string, any>;
  actions?: string[];
}

export interface ARETransition {
  id: string;
  from: string;
  to: string;
  condition?: string;
  priority: number;
  trigger?: string;
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
 * AREStateCompiler
 * Synchronisiert die Logik aus dem Root-Verzeichnis und dem Package-Verzeichnis.
 * Bereinigt redundante Definitionen und validiert Zustandsübergänge.
 */
export class AREStateCompiler {
  /**
   * Kompiliert und validiert eine ARE-Zustandsdefinition.
   * @param graph Die zu validierende Graph-Definition.
   */
  public compile(graph: AREGraph): ARECompilerOutput {
    const errors: ARECompilerError[] = [];

    if (!graph.states || graph.states.length === 0) {
      errors.push({ severity: 'error', message: 'State definition contains no states' });
      return { isValid: false, errors };
    }

    this.validateInitialState(graph, errors);
    this.validateTransitions(graph, errors);
    this.validateNodeLogic(graph, errors);

    const isValid = !errors.some(e => e.severity === 'error');

    return {
      isValid,
      errors,
      compiledData: isValid ? this.transform(graph) : undefined
    };
  }

  private validateInitialState(graph: AREGraph, errors: ARECompilerError[]): void {
    if (!graph.initialStateId) {
      errors.push({ severity: 'error', message: 'Initial state ID is missing' });
      return;
    }

    const startState = graph.states.find(s => s.id === graph.initialStateId);
    if (!startState) {
      errors.push({ severity: 'error', message: 'Initial state not found in states list', refId: graph.initialStateId });
    } else if (startState.type !== 'START') {
      errors.push({ severity: 'warning', message: 'Initial state is not of type START', refId: startState.id });
    }
  }

  private validateTransitions(graph: AREGraph, errors: ARECompilerError[]): void {
    for (const transition of graph.transitions) {
      const fromState = graph.states.find(s => s.id === transition.from);
      const toState = graph.states.find(s => s.id === transition.to);

      if (!fromState) {
        errors.push({ severity: 'error', message: `Transition source state ${transition.from} does not exist`, refId: transition.id });
      }
      if (!toState) {
        errors.push({ severity: 'error', message: `Transition target state ${transition.to} does not exist`, refId: transition.id });
      }

      if (fromState?.type === 'END') {
        errors.push({ severity: 'error', message: 'End states cannot have outgoing transitions', refId: transition.id });
      }

      if (fromState?.type === 'DECISION' && !transition.condition) {
        errors.push({ severity: 'error', message: 'Transitions from decision nodes require a condition', refId: transition.id });
      }
    }
  }

  private validateNodeLogic(graph: AREGraph, errors: ARECompilerError[]): void {
    const hasEndState = graph.states.some(s => s.type === 'END');
    if (!hasEndState) {
      errors.push({ severity: 'warning', message: 'Graph has no end state defined' });
    }

    for (const state of graph.states) {
      const outgoing = graph.transitions.filter(t => t.from === state.id);
      
      if (state.type === 'DECISION' && outgoing.length < 1) {
        errors.push({ severity: 'error', message: 'Decision state must have at least one outgoing transition', refId: state.id });
      }

      if (state.type === 'TASK' && outgoing.length === 0) {
        errors.push({ severity: 'warning', message: 'Task state has no outgoing transitions and is not marked as END', refId: state.id });
      }
    }
  }

  /**
   * Transformiert den Graphen in ein optimiertes Format für die Runtime.
   * Sortiert Transitions nach Priorität.
   */
  private transform(graph: AREGraph): AREGraph {
    return {
      ...graph,
      transitions: [...graph.transitions].sort((a, b) => (b.priority || 0) - (a.priority || 0))
    };
  }
}