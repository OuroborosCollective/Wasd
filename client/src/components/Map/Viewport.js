import React, { useState, useRef } from 'react';

const Viewport = ({ children }) => {
  const svgRef = useRef(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1000, h: 1000 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomIntensity = 0.1;
    const delta = e.deltaY > 0 ? 1 + zoomIntensity : 1 - zoomIntensity;

    const { left, top, width, height } = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - left;
    const mouseY = e.clientY - top;

    const svgMouseX = viewBox.x + (mouseX / width) * viewBox.w;
    const svgMouseY = viewBox.y + (mouseY / height) * viewBox.h;

    const newW = viewBox.w * delta;
    const newH = viewBox.h * delta;
    const newX = svgMouseX - (mouseX / width) * newW;
    const newY = svgMouseY - (mouseY / height) * newH;

    setViewBox({
      x: newX,
      y: newY,
      w: newW,
      h: newH
    });
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) {
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const { width, height } = svgRef.current.getBoundingClientRect();
    const dx = (e.clientX - lastMousePos.x) * (viewBox.w / width);
    const dy = (e.clientY - lastMousePos.y) * (viewBox.h / height);

    setViewBox((prev) => ({
      ...prev,
      x: prev.x - dx,
      y: prev.y - dy
    }));

    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        width: '100%',
        height: '100%',
        touchAction: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        backgroundColor: '#f0f0f0'
      }}
    >
      <defs>
        <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="gray" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect 
        x={viewBox.x - 5000} 
        y={viewBox.y - 5000} 
        width={viewBox.w + 10000} 
        height={viewBox.h + 10000} 
        fill="url(#grid)" 
      />
      {children}
    </svg>
  );
};

export default Viewport;