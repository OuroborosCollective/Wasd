export interface NpcDialogueLine {
  id: string;
  npcId: string;
  npcName: string;
  text: string;
  atMs: number;
}

export interface DialogueState {
  active: NpcDialogueLine | null;
  history: NpcDialogueLine[];
}

export function createDialogueState(): DialogueState {
  return {
    active: null,
    history: []
  };
}

export function openDialogue(
  state: DialogueState,
  line: Omit<NpcDialogueLine, "id" | "atMs">,
  currentTick = 0
): DialogueState {
  const tick = Number.isFinite(currentTick) && currentTick >= 0 ? Math.trunc(currentTick) : 0;
  const next: NpcDialogueLine = {
    ...line,
    id: ["dialogue", tick, state.history.length, line.npcId].join("_"),
    atMs: tick * 100
  };

  return {
    active: next,
    history: [next, ...state.history].slice(0, 24)
  };
}

export function closeDialogue(state: DialogueState): DialogueState {
  return {
    ...state,
    active: null
  };
}
