import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface ResourceData {
    id: string;
    label: string;
    currentLevel: number;
    consumptionRate: number;
    volatility: number;
}

interface ScarcityHeatmapProps {
    data: ResourceData[];
    predictionSteps?: number;
    resolution?: number;
}

const ScarcityPredictor = (initialValue: number, rate: number, volatility: number, steps: number) => {
    const predictions: number[] = [];
    let current = initialValue;
    for (let i = 0; i < steps; i++) {
        const noise = (Math.random() - 0.5) * volatility;
        current = Math.max(0, current - rate + noise);
        predictions.push(current);
    }
    return predictions;
};

export const ScarcityHeatmap: React.FC<ScarcityHeatmapProps> = ({
    data,
    predictionSteps = 100,
    resolution = 50
}) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const [timelineOffset, setTimelineOffset] = useState(0);

    const processedData = useMemo(() => {
        return data.map(res => ({
            ...res,
            forecast: ScarcityPredictor(res.currentLevel, res.consumptionRate, res.volatility, predictionSteps)
        }));
    }, [data, predictionSteps]);

    useEffect(() => {
        if (!mountRef.current) return;

        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050505);

        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.set(50, 50, 100);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        mountRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        const xSegments = predictionSteps - 1;
        const ySegments = data.length - 1;
        const geometry = new THREE.PlaneGeometry(200, 100, xSegments, ySegments);
        
        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            wireframe: false,
            flatShading: false
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        scene.add(mesh);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.PointLight(0xffffff, 1);
        directionalLight.position.set(50, 100, 50);
        scene.add(directionalLight);

        const updateGeometry = (offset: number) => {
            const positions = geometry.attributes.position;
            const colors = [];
            const color = new THREE.Color();

            for (let i = 0; i < processedData.length; i++) {
                const resource = processedData[i];
                for (let j = 0; j < predictionSteps; j++) {
                    const vertexIndex = i * predictionSteps + j;
                    const val = resource.forecast[(j + Math.floor(offset)) % predictionSteps] || 0;
                    
                    // Z-Axis mapping (Height)
                    positions.setZ(vertexIndex, val * 0.5);

                    // Heatmap Color mapping
                    const hue = (1 - Math.min(val / 100, 1)) * 0.3; // Green to Red
                    color.setHSL(hue, 1.0, 0.5);
                    colors.push(color.r, color.g, color.b);
                }
            }
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            positions.needsUpdate = true;
        };

        let frameId: number;
        const animate = () => {
            frameId = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };

        animate();
        updateGeometry(timelineOffset);

        const handleResize = () => {
            const w = mountRef.current?.clientWidth || 0;
            const h = mountRef.current?.clientHeight || 0;
            renderer.setSize(w, h);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(frameId);
            mountRef.current?.removeChild(renderer.domElement);
            geometry.dispose();
            material.dispose();
        };
    }, [processedData, timelineOffset]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#000' }}>
            <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '80%',
                background: 'rgba(255,255,255,0.1)',
                padding: '15px',
                borderRadius: '8px',
                backdropFilter: 'blur(10px)',
                color: '#fff',
                fontFamily: 'monospace'
            }}>
                <label style={{ display: 'block', marginBottom: '10px' }}>
                    TIMELINE FORECAST OFFSET: {timelineOffset.toFixed(0)}
                </label>
                <input 
                    type="range" 
                    min="0" 
                    max={predictionSteps - 1} 
                    value={timelineOffset}
                    onChange={(e) => setTimelineOffset(parseInt(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '10px' }}>
                    <span>PRESENT</span>
                    <span>FUTURE PROJECTION (DETERMINISTIC)</span>
                </div>
            </div>
            <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(0,0,0,0.7)',
                padding: '10px',
                color: '#0f0',
                border: '1px solid #0f0',
                fontSize: '12px'
            }}>
                SCARCITY_ENGINE_v4.0.1<br/>
                RESOURCES: {data.length}<br/>
                SAMPLES: {predictionSteps}
            </div>
        </div>
    );
};

export default ScarcityHeatmap;