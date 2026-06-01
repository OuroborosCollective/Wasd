/**
 * Ouroboros Drop Target Hook — Touch-Safe Drop Zones
 */

import { useCallback, useEffect, useRef } from "react";
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
  const { dragState, setHoveredTarget, registerDropTarget, unregisterDropTarget } = useDnD();
  const isHoveredRef = useRef(false);

  const isHovered = dragState.isDragging && dragState.hoveredTarget === id;
  const draggedItem = dragState.dragItem;

  const isValidTarget = useCallback(
    (item: DragItem | null): boolean => {
      if (!enabled || !item) return false;
      if (!accepts.includes(item.type)) return false;
      if (validateDrop && !validateDrop(item)) return false;
      return true;
    },
    [accepts, validateDrop, enabled]
  )(draggedItem);

  useEffect(() => {
    registerDropTarget({
      id,
      accepts,
      onDrop,
      validateDrop: validateDrop ?? ((item) => isValidTarget(item)),
    });
    return () => unregisterDropTarget(id);
  }, [id, accepts, onDrop, validateDrop, registerDropTarget, unregisterDropTarget, isValidTarget]);

  const handlePointerEnter = useCallback(() => {
    if (!dragState.isDragging || !draggedItem) return;
    if (isValidTarget(draggedItem)) {
      isHoveredRef.current = true;
      setHoveredTarget(id);
    }
  }, [dragState.isDragging, draggedItem, isValidTarget, setHoveredTarget, id]);

  const handlePointerLeave = useCallback(() => {
    if (isHoveredRef.current) {
      isHoveredRef.current = false;
      setHoveredTarget(null);
    }
  }, [setHoveredTarget]);

  const handlePointerUp = useCallback(() => {
    if (!dragState.isDragging || !draggedItem) return;
    if (isHoveredRef.current && isValidTarget(draggedItem)) {
      onDrop(draggedItem);
    }
    isHoveredRef.current = false;
    setHoveredTarget(null);
  }, [dragState.isDragging, draggedItem, isValidTarget, onDrop, setHoveredTarget]);

  return {
    isHovered,
    isValidTarget,
    dropHandlers: {
      onPointerEnter: handlePointerEnter,
      onPointerLeave: handlePointerLeave,
      onPointerUp: handlePointerUp,
    },
  };
}

export default useDropTarget;