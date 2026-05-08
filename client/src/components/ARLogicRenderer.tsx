import React, { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ARButton, XR, Interactive } from '@react-three/xr';

interface LogicGate {
  id: string;
  type: 'AND' | 'OR' | 'NOT';
  position: [number, number, number];
}

interface Connection {
  from: string;
  to: string;
}

interface ARLogicRendererProps {
  gates: LogicGate[];
  connections: Connection[];
  onGateSelect: (id: string) => void;
}

const ConnectionLine = ({ start, end }: { start: [number, number, number], end: [number, number, number] }) => {
  const line = useMemo(() => {
    const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
      color: 0x00ff00, 
      transparent: true, 
      opacity: 0.6 
    });
    return new THREE.Line(geometry, material);
  }, [start, end]);

  return <primitive object={line} />;
};

const GateNode = ({ gate, onSelect }: { gate: LogicGate, onSelect: (id: string) => void }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const getColor = () => {
    switch (gate.type) {
      case 'AND': return '#ff0000';
      case 'OR': return '#0000ff';
      case 'NOT': return '#ffff00';
      default: return '#ffffff';
    }
  };

  const InteractiveComponent = Interactive as any;

  return (
    <InteractiveComponent 
      onSelect={() => onSelect(gate.id)} 
      onHover={() => setHovered(true)} 
      onBlur={() => setHovered(false)}
    >
      <mesh position={gate.position} ref={meshRef as any}>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshStandardMaterial 
          color={hovered ? '#ffffff' : getColor()} 
          emissive={getColor()} 
          emissiveIntensity={0.5} 
        />
      </mesh>
    </InteractiveComponent>
  );
};

const Scene = ({ gates, connections, onGateSelect }: ARLogicRendererProps) => {
  const getGatePosition = (id: string): [number, number, number] => {
    const gate = gates.find(g => g.id === id);
    return gate ? gate.position : [0, 0, 0];
  };

  const XRComponent = XR as any;

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <XRComponent />
      {gates.map(gate => (
        <GateNode key={gate.id} gate={gate} onSelect={onGateSelect} />
      ))}
      {connections.map((conn, idx) => (
        <ConnectionLine 
          key={`${conn.from}-${conn.to}-${idx}`} 
          start={getGatePosition(conn.from)} 
          end={getGatePosition(conn.to)} 
        />
      ))}
    </>
  );
};

const ARLogicRenderer: React.FC<ARLogicRendererProps> = ({ gates, connections, onGateSelect }) => {
  const ARButtonComponent = ARButton as any;
  const CanvasComponent = Canvas as any;
  const XRComponent = XR as any;

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <ARButtonComponent sessionInit={{ requiredFeatures: ['hit-test'] }} />
      <CanvasComponent>
        <XRComponent>
          <Scene gates={gates} connections={connections} onGateSelect={onGateSelect} />
        </XRComponent>
      </CanvasComponent>
    </div>
  );
};

export default ARLogicRenderer;