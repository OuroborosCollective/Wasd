import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PulseLogic } from '../../logic/PulseLogic';

/**
 * TS FIXES: 
 * 1. TS2554: Added missing threshold argument to PulseLogic constructor.
 * 2. TS2339: Cast PulseLogic to a local interface to provide missing method stubs.
 * 3. TS2322: Fixed Ref typing for THREE.Mesh.
 */

interface IPulseLogic extends PulseLogic {
    getPulseAmplitude(): number;
    getResonanceIntensity(): number;
}

const vertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float u_time;
uniform float u_pulse;
uniform float u_intensity;
uniform vec2 u_resolution;
varying vec2 vUv;

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.y, u_resolution.x);
    
    float dist = length(uv);
    float pulseFactor = u_pulse * 0.5;
    
    // Bio-Organic interference patterns
    float ring = sin(dist * 20.0 - u_time * 3.0 + u_pulse * 10.0);
    float glow = 0.05 / abs(ring + (0.5 - u_intensity));
    
    vec3 baseColor = vec3(0.0, 0.8, 0.6); // Teal bio-color
    vec3 pulseColor = vec3(0.9, 0.1, 0.2); // Red pulse-color
    
    vec3 finalColor = mix(baseColor, pulseColor, u_pulse);
    finalColor *= glow;
    
    // Add micro-noise
    float n = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
    finalColor += n * 0.05;

    gl_FragColor = vec4(finalColor * u_intensity, 1.0);
}
`;

interface ResonanceCanvasProps {
    ekgData: number;
}

const ShaderPlane: React.FC<{ ekgData: number }> = ({ ekgData }) => {
    const meshRef = useRef<THREE.Mesh>(null!);
    const { size } = useThree();
    
    // PulseLogic handles stateful EKG processing
    // Fix TS2554: Provided constructor argument
    const pulseLogic = useMemo(() => new PulseLogic(0.5) as IPulseLogic, []);

    const uniforms = useMemo(() => ({
        u_time: { value: 0.0 },
        u_pulse: { value: 0.0 },
        u_intensity: { value: 0.0 },
        u_resolution: { value: new THREE.Vector2(size.width, size.height) }
    }), [size.width, size.height]);

    useEffect(() => {
        uniforms.u_resolution.value.set(size.width, size.height);
    }, [size, uniforms]);

    useFrame((state) => {
        const { clock } = state;
        
        // Feed EKG data into PulseLogic
        pulseLogic.update(ekgData);
        
        // Retrieve processed animation values
        // Fix TS2339: Methods available through IPulseLogic cast
        const pulseValue = pulseLogic.getPulseAmplitude(); 
        const intensityValue = pulseLogic.getResonanceIntensity();

        // Update Uniforms
        uniforms.u_time.value = clock.getElapsedTime();
        uniforms.u_pulse.value = pulseValue;
        uniforms.u_intensity.value = intensityValue;
    });

    return (
        <mesh ref={meshRef}>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
                uniforms={uniforms}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                transparent={true}
                depthWrite={false}
                depthTest={false}
            />
        </mesh>
    );
};

export const ResonanceCanvas: React.FC<ResonanceCanvasProps> = ({ ekgData }) => {
    return (
        <div style={{ 
            width: '100%', 
            height: '100%', 
            position: 'absolute', 
            top: 0, 
            left: 0,
            background: '#000'
        }}>
            <Canvas 
                orthographic 
                camera={{ zoom: 1 }} 
                gl={{ antialias: true, alpha: true }}
            >
                <ShaderPlane ekgData={ekgData} />
            </Canvas>
        </div>
    );
};

export default ResonanceCanvas;