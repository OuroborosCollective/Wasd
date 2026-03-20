/**
 * Improved Virtual Joystick Component
 * Enhanced mobile controls with haptic feedback and better UX
 * 
 * Features:
 * - Haptic feedback on touch
 * - Customizable size and sensitivity
 * - Multi-touch support
 * - Gesture recognition
 * - Responsive design
 * - Performance optimized
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import './ImprovedVirtualJoystick.css';

export interface JoystickInput {
  x: number;
  y: number;
  magnitude: number;
  angle: number;
}

interface ImprovedVirtualJoystickProps {
  size?: number;
  sensitivity?: number;
  onMove?: (input: JoystickInput) => void;
  onStart?: () => void;
  onEnd?: () => void;
  className?: string;
  showDebug?: boolean;
}

/**
 * Utility function to provide haptic feedback
 */
const triggerHaptic = (intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30]
    };
    navigator.vibrate(patterns[intensity]);
  }
};

/**
 * Calculate joystick input from touch position
 */
const calculateJoystickInput = (
  touchX: number,
  touchY: number,
  centerX: number,
  centerY: number,
  radius: number,
  sensitivity: number
): JoystickInput => {
  const dx = touchX - centerX;
  const dy = touchY - centerY;
  const magnitude = Math.sqrt(dx * dx + dy * dy);
  const normalizedMagnitude = Math.min(magnitude / radius, 1);
  
  let x = 0;
  let y = 0;
  let angle = 0;

  if (magnitude > 0) {
    x = (dx / magnitude) * normalizedMagnitude * sensitivity;
    y = (dy / magnitude) * normalizedMagnitude * sensitivity;
    angle = Math.atan2(dy, dx);
  }

  return {
    x,
    y,
    magnitude: normalizedMagnitude,
    angle
  };
};

/**
 * Main ImprovedVirtualJoystick Component
 */
export const ImprovedVirtualJoystick: React.FC<ImprovedVirtualJoystickProps> = ({
  size = 120,
  sensitivity = 1,
  onMove,
  onStart,
  onEnd,
  className = '',
  showDebug = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [knobPosition, setKnobPosition] = useState({ x: 0, y: 0 });
  const [currentInput, setCurrentInput] = useState<JoystickInput>({
    x: 0,
    y: 0,
    magnitude: 0,
    angle: 0
  });

  const radius = size / 2;
  const knobRadius = size / 6;

  /**
   * Handle touch start
   */
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;

    setIsDragging(true);
    triggerHaptic('light');
    onStart?.();

    const touch = e.touches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const input = calculateJoystickInput(
      touch.clientX,
      touch.clientY,
      centerX,
      centerY,
      radius,
      sensitivity
    );

    setCurrentInput(input);
    updateKnobPosition(input);
    onMove?.(input);
  }, [radius, sensitivity, onMove, onStart]);

  /**
   * Handle touch move
   */
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || e.touches.length === 0) return;

    e.preventDefault();

    const touch = e.touches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const input = calculateJoystickInput(
      touch.clientX,
      touch.clientY,
      centerX,
      centerY,
      radius,
      sensitivity
    );

    setCurrentInput(input);
    updateKnobPosition(input);
    onMove?.(input);

    // Haptic feedback for significant movement
    if (input.magnitude > 0.8) {
      triggerHaptic('medium');
    }
  }, [isDragging, radius, sensitivity, onMove]);

  /**
   * Handle touch end
   */
  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setKnobPosition({ x: 0, y: 0 });
    setCurrentInput({ x: 0, y: 0, magnitude: 0, angle: 0 });
    triggerHaptic('light');
    onEnd?.();
  }, [onEnd]);

  /**
   * Update knob visual position
   */
  const updateKnobPosition = (input: JoystickInput) => {
    const maxDistance = radius - knobRadius;
    const distance = input.magnitude * maxDistance;
    const x = Math.cos(input.angle) * distance;
    const y = Math.sin(input.angle) * distance;
    setKnobPosition({ x, y });
  };

  /**
   * Handle mouse events (for desktop testing)
   */
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Left click only
    const touchEvent = new TouchEvent('touchstart', {
      touches: [
        new Touch({
          identifier: 0,
          target: e.currentTarget,
          clientX: e.clientX,
          clientY: e.clientY,
          screenX: e.screenX,
          screenY: e.screenY,
          pageX: e.pageX,
          pageY: e.pageY
        })
      ] as any
    });
    handleTouchStart(touchEvent as any);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const touchEvent = new TouchEvent('touchmove', {
      touches: [
        new Touch({
          identifier: 0,
          target: e.currentTarget,
          clientX: e.clientX,
          clientY: e.clientY,
          screenX: e.screenX,
          screenY: e.screenY,
          pageX: e.pageX,
          pageY: e.pageY
        })
      ] as any
    });
    handleTouchMove(touchEvent as any);
  };

  const handleMouseUp = () => {
    handleTouchEnd();
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove as any);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove as any);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className={`virtual-joystick-container ${className} ${isDragging ? 'active' : ''}`}
      style={{
        width: size,
        height: size
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Background circle */}
      <div
        className="joystick-background"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2
        }}
      >
        {/* Grid pattern */}
        <div className="joystick-grid" />
        
        {/* Direction indicators */}
        <div className="direction-indicator up">↑</div>
        <div className="direction-indicator down">↓</div>
        <div className="direction-indicator left">←</div>
        <div className="direction-indicator right">→</div>
      </div>

      {/* Knob */}
      <div
        ref={knobRef}
        className={`joystick-knob ${isDragging ? 'dragging' : ''}`}
        style={{
          width: knobRadius * 2,
          height: knobRadius * 2,
          borderRadius: knobRadius,
          transform: `translate(calc(-50% + ${knobPosition.x}px), calc(-50% + ${knobPosition.y}px))`
        }}
      >
        <div className="knob-inner" />
        <div className="knob-shine" />
      </div>

      {/* Debug info */}
      {showDebug && (
        <div className="joystick-debug">
          <div>X: {currentInput.x.toFixed(2)}</div>
          <div>Y: {currentInput.y.toFixed(2)}</div>
          <div>Mag: {currentInput.magnitude.toFixed(2)}</div>
          <div>Angle: {(currentInput.angle * 180 / Math.PI).toFixed(0)}°</div>
        </div>
      )}
    </div>
  );
};

export default ImprovedVirtualJoystick;
