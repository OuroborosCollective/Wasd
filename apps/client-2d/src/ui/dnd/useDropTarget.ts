/**
 * Ouroboros Drop Target Hook — Touch-Safe Drop Zones
 *
 * Pointer-Event based drop-zone hook for inventory/equipment DnD.
 * Keeps validation deterministic and delegates final state changes upward.
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDnD, type DragItem, type DragItemType } from "./DnDContext";

interface UseDropTargetOptions {
  id: string;
  accepts: DragItemType[];
  onDrop: (item: DragItem) => void;
  validateDrop?: (item: DragItem) => boolean;
  enabled?: boolean;
}

export function useDropTarget({
  id,
  accepts,
  onDrop,
  validateDrop,
  enabled = true,
}: UseDropTargetOptions) {
  const {
    dragState,
    setHoveredTarget,
    registerDropTarget,
    unregisterDropTarget,
  } = useDnD();

  const isHoveredRef = useRef(false);

  const draggedItem = dragState.dragItem;

  const isValidTarget = useCallback(
    (item: DragItem | null): boolean => {
      if (!enabled) return false;
      if (!item) return false;
      if (!accepts.includes(item.type)) return false;
      if (validateDrop && !validateDrop(item)) return false;

      return true;
    },
    [accepts, validateDrop, enabled]
  );

  const canDrop = useMemo(() => {
    return isValidTarget(draggedItem);
  }, [isValidTarget, draggedItem]);

  const isHovered = dragState.isDragging && dragState.hoveredTarget === id;

  useEffect(() => {
    if (!enabled) {
      unregisterDropTarget(id);
      return;
    }

    registerDropTarget({
      id,
      accepts,
      onDrop,
      validateDrop: validateDrop ?? isValidTarget,
    });

    return () => {
      unregisterDropTarget(id);
    };
  }, [
    id,
    accepts,
    onDrop,
    validateDrop,
    enabled,
    isValidTarget,
    registerDropTarget,
    unregisterDropTarget,
  ]);

  const clearHover = useCallback(() => {
    if (isHoveredRef.current) {
      isHoveredRef.current = false;
    }

    setHoveredTarget(null);
  }, [setHoveredTarget]);

  const handlePointerEnter = useCallback(() => {
    if (!enabled) return;
    if (!dragState.isDragging) return;
    if (!draggedItem) return;

    if (!isValidTarget(draggedItem)) return;

    isHoveredRef.current = true;
    setHoveredTarget(id);
  }, [
    enabled,
    dragState.isDragging,
    draggedItem,
    isValidTarget,
    setHoveredTarget,
    id,
  ]);

  const handlePointerLeave = useCallback(() => {
    clearHover();
  }, [clearHover]);

  const handlePointerCancel = useCallback(() => {
    clearHover();
  }, [clearHover]);

  const handlePointerUp = useCallback(() => {
    if (!enabled) {
      clearHover();
      return;
    }

    if (!dragState.isDragging || !draggedItem) {
      clearHover();
      return;
    }

    if (isHoveredRef.current && isValidTarget(draggedItem)) {
      onDrop(draggedItem);
    }

    clearHover();
  }, [
    enabled,
    dragState.isDragging,
    draggedItem,
    isValidTarget,
    onDrop,
    clearHover,
  ]);

  return {
    isHovered,
    canDrop,
    isValidTarget,
    dropHandlers: {
      onPointerEnter: handlePointerEnter,
      onPointerLeave: handlePointerLeave,
      onPointerCancel: handlePointerCancel,
      onPointerUp: handlePointerUp,
    },
  };
}

export default useDropTarget;
