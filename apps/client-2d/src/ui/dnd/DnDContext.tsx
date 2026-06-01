/**
 * Ouroboros DnD Context — Touch-Safe Drag & Drop System
 * 
 * Uses Pointer Events for unified mouse/touch support.
 * Follows Stateless Determinism: Server is authoritative for all state changes.
 */

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";

export type DragItemType = "INVENTORY_ITEM" | "EQUIPMENT_ITEM";

export interface DragItem {
  type: DragItemType;
  itemId: string;
  slot: string;
  rarity?: string;
  name?: string;
}

export interface DropTarget {
  id: string;
  accepts: DragItemType[];
  onDrop?: (item: DragItem) => void;
  validateDrop?: (item: DragItem) => boolean;
}

export interface DragState {
  isDragging: boolean;
  dragItem: DragItem | null;
  ghostPosition: { x: number; y: number };
  hoveredTarget: string | null;
}

interface DnDContextValue {
  dragState: DragState;
  startDrag: (item: DragItem, event: React.PointerEvent) => void;
  updateGhostPosition: (x: number, y: number) => void;
  setHoveredTarget: (targetId: string | null) => void;
  endDrag: (dropped: boolean) => void;
  cancelDrag: () => void;
  registerDropTarget: (target: DropTarget) => void;
  unregisterDropTarget: (targetId: string) => void;
}

const DnDContext = createContext<DnDContextValue | null>(null);

export function useDnD(): DnDContextValue {
  const ctx = useContext(DnDContext);
  if (!ctx) {
    throw new Error("useDnD must be used within DnDProvider");
  }
  return ctx;
}

interface DnDProviderProps {
  children: ReactNode;
}

export function DnDProvider({ children }: DnDProviderProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragItem: null,
    ghostPosition: { x: 0, y: 0 },
    hoveredTarget: null,
  });

  const dropTargetsRef = useRef<Map<string, DropTarget>>(new Map());
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const startDrag = useCallback((item: DragItem, event: React.PointerEvent) => {
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    dragStartPosRef.current = { x: event.clientX, y: event.clientY };
    setDragState({
      isDragging: true,
      dragItem: item,
      ghostPosition: { x: event.clientX, y: event.clientY },
      hoveredTarget: null,
    });
  }, []);

  const updateGhostPosition = useCallback((x: number, y: number) => {
    setDragState((prev) => ({ ...prev, ghostPosition: { x, y } }));
  }, []);

  const setHoveredTarget = useCallback((targetId: string | null) => {
    setDragState((prev) => ({ ...prev, hoveredTarget: targetId }));
  }, []);

  const endDrag = useCallback((dropped: boolean) => {
    const { dragItem, hoveredTarget } = dragState;
    if (dropped && dragItem && hoveredTarget) {
      const target = dropTargetsRef.current.get(hoveredTarget);
      if (target && (!target.validateDrop || target.validateDrop(dragItem))) {
        target.onDrop?.(dragItem);
      }
    }
    setDragState({ isDragging: false, dragItem: null, ghostPosition: { x: 0, y: 0 }, hoveredTarget: null });
  }, [dragState]);

  const cancelDrag = useCallback(() => {
    setDragState({ isDragging: false, dragItem: null, ghostPosition: { x: 0, y: 0 }, hoveredTarget: null });
  }, []);

  const registerDropTarget = useCallback((target: DropTarget) => {
    dropTargetsRef.current.set(target.id, target);
  }, []);

  const unregisterDropTarget = useCallback((targetId: string) => {
    dropTargetsRef.current.delete(targetId);
  }, []);

  const value: DnDContextValue = {
    dragState,
    startDrag,
    updateGhostPosition,
    setHoveredTarget,
    endDrag,
    cancelDrag,
    registerDropTarget,
    unregisterDropTarget,
  };

  return (
    <DnDContext.Provider value={value}>
      {children}
      {dragState.isDragging && dragState.dragItem && (
        <div
          className="dnd-ghost"
          style={{
            left: dragState.ghostPosition.x - 24,
            top: dragState.ghostPosition.y - 24,
            borderColor: getRarityColor(dragState.dragItem.rarity),
            boxShadow: `0 0 20px ${getRarityColor(dragState.dragItem.rarity)}40`,
          }}
        >
          <span className="dnd-ghost-text">
            {dragState.dragItem.name?.slice(0, 2) || dragState.dragItem.itemId.slice(-2)}
          </span>
        </div>
      )}
    </DnDContext.Provider>
  );
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
  return colors[rarity || "common"] || "#9d9d9d";
}