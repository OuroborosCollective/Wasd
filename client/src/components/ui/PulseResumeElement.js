import React, { useEffect, useRef } from 'react';

const PulseResumeElement = ({ phaseShift = 0, children, className = "" }) => {
  const elementRef = useRef(null);

  useEffect(() => {
    let animationFrameId;

    const syncWithEngine = () => {
      // Mock/Interface for ResonanceEngine logic to calculate O(1) UI update
      // Logic: intensity = (sin(t * freq + phaseShift) + 1) / 2
      const time = performance.now() * 0.002;
      const frequency = 1.0;
      const intensity = (Math.sin(time * frequency + phaseShift) + 1) / 2;

      if (elementRef.current) {
        elementRef.current.style.setProperty('--pulse-opacity', intensity.toFixed(4));
      }

      animationFrameId = requestAnimationFrame(syncWithEngine);
    };

    animationFrameId = requestAnimationFrame(syncWithEngine);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [phaseShift]);

  return (
    <div
      ref={elementRef}
      className={className}
      style={{
        opacity: 'var(--pulse-opacity, 1)',
        willChange: 'opacity',
        transition: 'none'
      }}
    >
      {children}
    </div>
  );
};

export default PulseResumeElement;