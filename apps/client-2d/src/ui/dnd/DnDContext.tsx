/**
 * Ouroboros DnD Context — Touch-Safe Drag & Drop System
 *
 * Uses Pointer Events for unified mouse/touch support.
 * Follows Stateless Determinism: Server is authoritative for all state changes.
 *
 * IMPORTANT:
 * - This client-side DnD only creates UI intent.
 * - Real inventory/equipment mutation must happen server-side.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type DragItemType = "INVENTORY_ITEM" | "EQUIPMENT_ITEM";

export interface DragItem {
  readonly type: DragItemType;
  readonly itemId: string;
  readonly slot: string;
  readonly rarity?: string;
  readonly name?: string;
}

export interface DropTarget {
  readonly id: string;
  readonly accepts: readonly DragItemType[];
  readonly onDrop?: (item: DragItem) => void;
  readonly validateDrop?: (item: DragItem) => boolean;
}

export interface DragState {
  readonly isDragging: boolean;
  readonly dragItem: DragItem | null;
  readonly ghostPosition: { readonly x: number; readonly y: number };
  readonly hoveredTarget: string | null;
}

interface DnDContextValue {
  readonly dragState: DragState;
  readonly startDrag: (item: DragItem, event: React.PointerEvent) => void;
  readonly updateGhostPosition: (x: number, y: number) => void;
  readonly setHoveredTarget: (targetId: string | null) => void;
  readonly endDrag: (dropped: boolean) => void;
  readonly cancelDrag: () => void;
  readonly registerDropTarget: (target: DropTarget) => void;
  readonly unregisterDropTarget: (targetId: string) => void;
}

const EMPTY_DRAG_STATE: DragState = {
  isDragging: false,
  dragItem: null,
  ghostPosition: { x: 0, y: 0 },
  hoveredTarget: null,
};

const DnDContext = createContext<DnDContextValue | null>(null);

export function useDnD(): DnDContextValue {
  const ctx = useContext(DnDContext);

  if (!ctx) {
    throw new Error("useDnD must be used within DnDProvider");
  }

  return ctx;
}

interface DnDProviderProps {
  readonly children: ReactNode;
}

export function DnDProvider({ children }: DnDProviderProps) {
  const [dragState, setDragState] = useState<DragState>(EMPTY_DRAG_STATE);

  const dragStateRef = useRef<DragState>(EMPTY_DRAG_STATE);
  const dropTargetsRef = useRef<Map<string, DropTarget>>(new Map());

  const capturedElementRef = useRef<HTMLElement | null>(null);
  const capturedPointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  const releasePointerCapture = useCallback(() => {
    const element = capturedElementRef.current;
    const pointerId = capturedPointerIdRef.current;

    if (element && pointerId !== null) {
      try {
        if (element.hasPointerCapture?.(pointerId)) {
          element.releasePointerCapture(pointerId);
        }
      } catch {
        // Browser may already have released capture. Safe to ignore.
      }
    }

    capturedElementRef.current = null;
    capturedPointerIdRef.current = null;
  }, []);

  const resetDragState = useCallback(() => {
    releasePointerCapture();
    dragStateRef.current = EMPTY_DRAG_STATE;
    setDragState(EMPTY_DRAG_STATE);
  }, [releasePointerCapture]);

  const startDrag = useCallback((item: DragItem, event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget;

    if (target instanceof HTMLElement) {
      try {
        target.setPointerCapture(event.pointerId);
        capturedElementRef.current = target;
        capturedPointerIdRef.current = event.pointerId;
      } catch {
        capturedElementRef.current = null;
        capturedPointerIdRef.current = null;
      }
    }

    const nextState: DragState = {
      isDragging: true,
      dragItem: item,
      ghostPosition: {
        x: event.clientX,
        y: event.clientY,
      },
      hoveredTarget: null,
    };

    dragStateRef.current = nextState;
    setDragState(nextState);
  }, []);

  const updateGhostPosition = useCallback((x: number, y: number) => {
    setDragState((prev) => {
      if (!prev.isDragging) return prev;

      const nextState: DragState = {
        ...prev,
        ghostPosition: { x, y },
      };

      dragStateRef.current = nextState;
      return nextState;
    });
  }, []);

  const setHoveredTarget = useCallback((targetId: string | null) => {
    setDragState((prev) => {
      if (!prev.isDragging) return prev;
      if (prev.hoveredTarget === targetId) return prev;

      const nextState: DragState = {
        ...prev,
        hoveredTarget: targetId,
      };

      dragStateRef.current = nextState;
      return nextState;
    });
  }, []);

  const endDrag = useCallback(
    (dropped: boolean) => {
      const currentState = dragStateRef.current;
      const { dragItem, hoveredTarget } = currentState;

      if (dropped && dragItem && hoveredTarget) {
        const target = dropTargetsRef.current.get(hoveredTarget);

        const acceptsType = target?.accepts.includes(dragItem.type) ?? false;
        const passesValidation = target?.validateDrop ? target.validateDrop(dragItem) : true;

        if (target && acceptsType && passesValidation) {
          target.onDrop?.(dragItem);
        }
      }

      resetDragState();
    },
    [resetDragState],
  );

  const cancelDrag = useCallback(() => {
    resetDragState();
  }, [resetDragState]);

  const registerDropTarget = useCallback((target: DropTarget) => {
    dropTargetsRef.current.set(target.id, target);
  }, []);

  const unregisterDropTarget = useCallback((targetId: string) => {
    dropTargetsRef.current.delete(targetId);

    setDragState((prev) => {
      if (prev.hoveredTarget !== targetId) return prev;

      const nextState: DragState = {
        ...prev,
        hoveredTarget: null,
      };

      dragStateRef.current = nextState;
      return nextState;
    });
  }, []);

  useEffect(() => {
    return () => {
      releasePointerCapture();
      dropTargetsRef.current.clear();
    };
  }, [releasePointerCapture]);

  const value: DnDContextValue = useMemo(
    () => ({
      dragState,
      startDrag,
      updateGhostPosition,
      setHoveredTarget,
      endDrag,
      cancelDrag,
      registerDropTarget,
      unregisterDropTarget,
    }),
    [
      dragState,
      startDrag,
      updateGhostPosition,
      setHoveredTarget,
      endDrag,
      cancelDrag,
      registerDropTarget,
      unregisterDropTarget,
    ],
  );

  return (
    <DnDContext.Provider value={value}>
      {children}

      {dragState.isDragging && dragState.dragItem && (
        <div
          className="dnd-ghost"
          aria-hidden="true"
          style={{
            left: dragState.ghostPosition.x - 24,
            top: dragState.ghostPosition.y - 24,
            borderColor: getRarityColor(dragState.dragItem.rarity),
            boxShadow: `0 0 20px ${getRarityColor(dragState.dragItem.rarity)}40`,
          }}
        >
          <span className="dnd-ghost-text">
            {getGhostLabel(dragState.dragItem)}
          </span>
        </div>
      )}
    </DnDContext.Provider>
  );
}

function getGhostLabel(item: DragItem): string {
  const label = item.name?.trim();

  if (label && label.length > 0) {
    return label.slice(0, 2).toUpperCase();
  }

  return item.itemId.slice(-2).toUpperCase();
}

function getRarityColor(rarity?: string): string {
  const colors: Record<string, string> = {
    common: "#9d9d9d",
    uncommon: "#1eff00",
    rare: "#0070dd",
    epic: "#a335ee",
    legendary: "#ff8000",
    mystic: "#00ccff",
  };

  return colors[rarity || "common"] || colors.common;
}
