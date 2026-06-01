/**
 * Ouroboros Drag Source Hook — Touch-Safe Draggable Elements
 */

import { useCallback, useRef } from "react";
import { useDnD, type DragItem } from "./DnDContext";

interface UseDragSourceOptions {
  item: DragItem;
  disabled?: boolean;
}

export function useDragSource({ item, disabled = false }: UseDragSourceOptions) {
  const { dragState, startDrag, updateGhostPosition, endDrag } = useDnD();
  const pointerIdRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  const isDragging = dragState.isDragging && dragState.dragItem?.itemId === item.itemId;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    pointerIdRef.current = e.pointerId;
    isDraggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startDrag(item, e);
  }, [item, disabled, startDrag]);

  // Attach global move/up listeners when dragging
  if (isDragging && typeof window !== "undefined") {
    const handleMove = (e: PointerEvent) => updateGhostPosition(e.clientX, e.clientY);
    const handleUp = (e: PointerEvent) => {
      if (isDraggingRef.current && pointerIdRef.current === e.pointerId) {
        isDraggingRef.current = false;
        pointerIdRef.current = null;
        endDrag(true);
      }
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
  }

  return { pointerDownHandlers: { onPointerDown: handlePointerDown }, isDragging };
}

export default useDragSource;