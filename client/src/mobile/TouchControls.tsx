/**
 * TouchControls Component
 * Advanced touch input system with gestures and haptic feedback
 * 
 * Features:
 * - Virtual joystick with analog input
 * - Multi-touch gesture support (swipe, pinch, long-press)
 * - Haptic feedback on mobile
 * - Customizable sensitivity
 * - Dead zone detection
 * - Responsive design
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import './TouchControls.css';

export interface TouchInput {
  x: number;
  y: number;
  magnitude: number;
  angle: number;
}

export interface GestureEvent {
  type: 'swipe' | 'pinch' | 'longpress' | 'tap' | 'doubletap';
  direction?: 'up' | 'down' | 'left' | 'right';
  scale?: number;
  position?: { x: number; y: number };
}

interface TouchControlsProps {
  onMove?: (input: TouchInput) => void;
  onGesture?: (gesture: GestureEvent) => void;
  onAction?: (action: string) => void;
  sensitivity?: number;
  deadZone?: number;
  enableHaptics?: boolean;
  className?: string;
}

/**
 * Virtual Joystick Component
 */
const VirtualJoystick: React.FC<{
  onMove: (input: TouchInput) => void;
  sensitivity: number;
  deadZone: number;
  enableHaptics: boolean;
}> = ({ onMove, sensitivity, deadZone, enableHaptics }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);

  const JOYSTICK_SIZE = 120;
  const STICK_RADIUS = 40;

  // Trigger haptic feedback
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHaptics || !navigator.vibrate) return;

    const patterns: Record<string, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 50
    };

    navigator.vibrate(patterns[type]);
  }, [enableHaptics]);

  // Calculate joystick input
  const calculateInput = useCallback(
    (x: number, y: number): TouchInput => {
      const dx = x - JOYSTICK_SIZE / 2;
      const dy = y - JOYSTICK_SIZE / 2;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = STICK_RADIUS;

      let magnitude = Math.min(distance / maxDistance, 1);

      // Apply dead zone
      if (magnitude < deadZone) {
        magnitude = 0;
      }

      const angle = Math.atan2(dy, dx);

      return {
        x: magnitude * Math.cos(angle) * sensitivity,
        y: magnitude * Math.sin(angle) * sensitivity,
        magnitude,
        angle
      };
    },
    [sensitivity, deadZone]
  );

  // Draw joystick
  const drawJoystick = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = JOYSTICK_SIZE;
    const centerX = size / 2;
    const centerY = size / 2;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw background circle
    ctx.fillStyle = isActive ? 'rgba(100, 150, 255, 0.2)' : 'rgba(100, 150, 255, 0.1)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, STICK_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = isActive ? 'rgba(100, 150, 255, 0.6)' : 'rgba(100, 150, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw stick
    ctx.fillStyle = isActive ? 'rgba(100, 150, 255, 0.8)' : 'rgba(100, 150, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(centerX + position.x, centerY + position.y, 20, 0, Math.PI * 2);
    ctx.fill();

    // Draw stick border
    ctx.strokeStyle = isActive ? '#6b9fff' : 'rgba(100, 150, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw direction indicator
    if (isActive && (position.x !== 0 || position.y !== 0)) {
      const angle = Math.atan2(position.y, position.x);
      ctx.strokeStyle = '#6b9fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * STICK_RADIUS * 0.8,
        centerY + Math.sin(angle) * STICK_RADIUS * 0.8
      );
      ctx.stroke();
    }
  }, [isActive, position]);

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (touchIdRef.current !== null) return;

      const touch = e.touches[0];
      if (!touch) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      touchIdRef.current = touch.identifier;
      setIsActive(true);
      triggerHaptic('light');

      const input = calculateInput(x, y);
      setPosition({ x: input.x * STICK_RADIUS, y: input.y * STICK_RADIUS });
      onMove(input);
    },
    [calculateInput, onMove, triggerHaptic]
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (touchIdRef.current === null) return;

      const touch = Array.from(e.touches).find((t) => t.identifier === touchIdRef.current);
      if (!touch) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const input = calculateInput(x, y);
      setPosition({ x: input.x * STICK_RADIUS, y: input.y * STICK_RADIUS });
      onMove(input);
    },
    [calculateInput, onMove]
  );

  // Handle touch end
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (touchIdRef.current === null) return;

      const touch = Array.from(e.changedTouches).find((t) => t.identifier === touchIdRef.current);
      if (!touch) return;

      touchIdRef.current = null;
      setIsActive(false);
      setPosition({ x: 0, y: 0 });

      const input = calculateInput(JOYSTICK_SIZE / 2, JOYSTICK_SIZE / 2);
      onMove(input);
    },
    [calculateInput, onMove]
  );

  // Redraw on position change
  useEffect(() => {
    drawJoystick();
  }, [drawJoystick]);

  return (
    <div ref={containerRef} className="virtual-joystick">
      <canvas
        ref={canvasRef}
        width={JOYSTICK_SIZE}
        height={JOYSTICK_SIZE}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="joystick-canvas"
      />
    </div>
  );
};

/**
 * Action Buttons Component
 */
const ActionButtons: React.FC<{
  onAction: (action: string) => void;
  enableHaptics: boolean;
}> = ({ onAction, enableHaptics }) => {
  const triggerHaptic = () => {
    if (enableHaptics && navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  const handleAction = (action: string) => {
    triggerHaptic();
    onAction(action);
  };

  return (
    <div className="action-buttons">
      <button
        className="action-btn primary"
        onTouchStart={() => handleAction('attack')}
        title="Attack"
      >
        ⚔️
      </button>
      <button
        className="action-btn secondary"
        onTouchStart={() => handleAction('skill')}
        title="Skill"
      >
        ✨
      </button>
      <button
        className="action-btn tertiary"
        onTouchStart={() => handleAction('interact')}
        title="Interact"
      >
        🔧
      </button>
      <button
        className="action-btn quaternary"
        onTouchStart={() => handleAction('menu')}
        title="Menu"
      >
        ⚙️
      </button>
    </div>
  );
};

/**
 * Gesture Detector Component
 */
const GestureDetector: React.FC<{
  onGesture: (gesture: GestureEvent) => void;
  enableHaptics: boolean;
  children: React.ReactNode;
}> = ({ onGesture, enableHaptics, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  const triggerHaptic = (type: 'light' | 'medium' = 'light') => {
    if (!enableHaptics || !navigator.vibrate) return;
    navigator.vibrate(type === 'light' ? 10 : 20);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const time = Date.now() - touchStartRef.current.time;

    // Detect swipe
    if (distance > 50 && time < 300) {
      const angle = Math.atan2(dy, dx);
      let direction: 'up' | 'down' | 'left' | 'right' = 'up';

      if (angle > -Math.PI / 4 && angle <= Math.PI / 4) {
        direction = 'right';
      } else if (angle > Math.PI / 4 && angle <= (3 * Math.PI) / 4) {
        direction = 'down';
      } else if (angle > (3 * Math.PI) / 4 || angle <= -(3 * Math.PI) / 4) {
        direction = 'left';
      } else {
        direction = 'up';
      }

      triggerHaptic('medium');
      onGesture({ type: 'swipe', direction });
    }
    // Detect long-press
    else if (distance < 20 && time > 500) {
      triggerHaptic('medium');
      onGesture({
        type: 'longpress',
        position: { x: touch.clientX, y: touch.clientY }
      });
    }
    // Detect tap/double-tap
    else if (distance < 20 && time < 300) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        triggerHaptic('light');
        onGesture({
          type: 'doubletap',
          position: { x: touch.clientX, y: touch.clientY }
        });
      } else {
        triggerHaptic('light');
        onGesture({
          type: 'tap',
          position: { x: touch.clientX, y: touch.clientY }
        });
      }
      lastTapRef.current = now;
    }

    touchStartRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="gesture-detector"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
};

/**
 * Main TouchControls Component
 */
export const TouchControls: React.FC<TouchControlsProps> = ({
  onMove,
  onGesture,
  onAction,
  sensitivity = 1,
  deadZone = 0.1,
  enableHaptics = true,
  className = ''
}) => {
  const isMobileDevice = useCallback(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }, []);

  if (!isMobileDevice()) {
    return null;
  }

  return (
    <GestureDetector onGesture={onGesture || (() => {})} enableHaptics={enableHaptics}>
      <div className={`touch-controls-container ${className}`}>
        <VirtualJoystick
          onMove={onMove || (() => {})}
          sensitivity={sensitivity}
          deadZone={deadZone}
          enableHaptics={enableHaptics}
        />

        {onAction && (
          <ActionButtons onAction={onAction} enableHaptics={enableHaptics} />
        )}
      </div>
    </GestureDetector>
  );
};

export default TouchControls;
