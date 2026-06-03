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
  line: Omit<NpcDialogueLine, "id" | "atMs">
): DialogueState {
  const next: NpcDialogueLine = {
    ...line,
    id: `dialogue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    atMs: Date.now()
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