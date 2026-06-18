import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import type { GovernanceAction, GovernanceActionDiagnostic, GovernanceActionEvaluation, GovernanceActionKind } from "./GovernanceTypes.js";

export type GovernanceActionValidator = (action: GovernanceAction) => readonly GovernanceActionDiagnostic[];

export interface GovernanceActionEvaluationContext {
  readonly validators?: Partial<Record<GovernanceActionKind, GovernanceActionValidator>>;
}

function diag(code: string, message: string): GovernanceActionDiagnostic {
  return Object.freeze({ code, message, sideChannel: true });
}

function hash(action: GovernanceAction, status: string, diagnostics: readonly GovernanceActionDiagnostic[]): string {
  return stableHash32([
    "GOV_ACTION_EVAL_V1",
    action.actionId ?? "",
    action.type,
    action.actorId ?? "",
    action.territoryId,
    action.tick ?? 0,
    status,
    diagnostics.map((entry) => entry.code).sort().join(","),
  ].join("|")).toString(16);
}

export function evaluateGovernanceAction(action: GovernanceAction, context: GovernanceActionEvaluationContext = {}): GovernanceActionEvaluation {
  const kind = action.type;
  const validator = context.validators?.[kind];

  if (!validator) {
    const diagnostics = Object.freeze([diag("unsupported_action", `No registered validator for ${kind}`)]);
    return Object.freeze({
      actionId: action.actionId,
      kind,
      status: "unsupported_action",
      supported: false,
      mutatesState: false,
      diagnostics,
      evaluationHash: hash(action, "unsupported_action", diagnostics),
    });
  }

  const diagnostics = Object.freeze([...validator(action)]);
  const status = diagnostics.length > 0 ? "rejected" : "validated_no_mutation";
  return Object.freeze({
    actionId: action.actionId,
    kind,
    status,
    supported: diagnostics.length === 0,
    mutatesState: false,
    diagnostics,
    evaluationHash: hash(action, status, diagnostics),
  });
}
