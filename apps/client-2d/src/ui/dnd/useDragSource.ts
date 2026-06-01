/**
 * Ouroboros Drag Source Hook — Touch-Safe Draggable Elements
 *
 * Pointer Events based drag source.
 * Safe for mouse, touch, and pen.
 * Listener lifecycle is handled through useEffect to avoid render-time leaks.
 */

import { useCallback, useEffect, useRef } from "react";
import { useDnD, type DragItem } from "./DnDContext";

interface UseDragSourceOptions {
  item: DragItem;
  disabled?: boolean;
}

export function useDragSource({ item, disabled = false }: UseDragSourceOptions) {
  const { dragState, startDrag, updateGhostPosition, endDrag } = useDnD();

  const pointerIdRef = useRef<number | null>(null);
  const sourceElementRef = useRef<HTMLElement | null>(null);
  const isPointerDraggingRef = useRef(false);

  const isDragging =
    dragState.isDragging && dragState.dragItem?.itemId === item.itemId;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (disabled) return;

      // Only primary button for mouse.
      if (e.pointerType === "mouse" && e.button !== 0) return;

      e.preventDefault();
      e.stopPropagation();

      pointerIdRef.current = e.pointerId;
      sourceElementRef.current = e.currentTarget;
      isPointerDraggingRef.current = true;

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Some browsers can throw if capture is invalid.
        // Drag still works through global listeners.
      }

      startDrag(item, e);
    },
    [disabled, item, startDrag],
  );

  useEffect(() => {
    if (!isDragging || typeof window === "undefined") return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!isPointerDraggingRef.current) return;
      if (pointerIdRef.current !== e.pointerId) return;

      e.preventDefault();
      updateGhostPosition(e.clientX, e.clientY);
    };

    const finishDrag = (shouldCommitDrop: boolean, e: PointerEvent) => {
      if (!isPointerDraggingRef.current) return;
      if (pointerIdRef.current !== e.pointerId) return;

      const pointerId = pointerIdRef.current;
      const sourceElement = sourceElementRef.current;

      isPointerDraggingRef.current = false;
      pointerIdRef.current = null;
      sourceElementRef.current = null;

      if (sourceElement && pointerId !== null) {
        try {
          if (sourceElement.hasPointerCapture(pointerId)) {
            sourceElement.releasePointerCapture(pointerId);
          }
        } catch {
          // Ignore release errors. Browser may already have released capture.
        }
      }

      endDrag(shouldCommitDrop);
    };

    const handlePointerUp = (e: PointerEvent) => {
      finishDrag(true, e);
    };

    const handlePointerCancel = (e: PointerEvent) => {
      finishDrag(false, e);
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("blur", handleWindowBlur);

    function handleWindowBlur() {
      if (!isPointerDraggingRef.current) return;

      const pointerId = pointerIdRef.current;
      const sourceElement = sourceElementRef.current;

      isPointerDraggingRef.current = false;
      pointerIdRef.current = null;
      sourceElementRef.current = null;

      if (sourceElement && pointerId !== null) {
        try {
          if (sourceElement.hasPointerCapture(pointerId)) {
            sourceElement.releasePointerCapture(pointerId);
          }
        } catch {
          // Ignore release errors.
        }
      }

      endDrag(false);
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [isDragging, updateGhostPosition, endDrag]);

  useEffect(() => {
    if (!disabled) return;
    if (!isPointerDraggingRef.current) return;

    isPointerDraggingRef.current = false;
    pointerIdRef.current = null;
    sourceElementRef.current = null;

    endDrag(false);
  }, [disabled, endDrag]);

  return {
    pointerDownHandlers: {
      onPointerDown: handlePointerDown,
    },
    isDragging,
  };
}

export default useDragSource;
