/**
 * @file client/src/components/world/WorldVisualizer.tsx
 * @description Babylon.js 3D World Visualizer
 * Renders the Arelorian world state in real-time with LOD and Performance Monitoring
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as BABYLON from '@babylonjs/core';
import { useWorld } from '../../dashboard/context/WorldContext';

interface RegionMesh {
  id: string;
  mesh: BABYLON.Mesh;
  material: BABYLON.PBRMaterial;
  lodLevel: number;
}

// Performance thresholds
const FPS_LOW = 30;
const FPS_MEDIUM = 45;
const LOD_DISTANCES = [20, 40, 60]; // LOD transition distances

export function WorldVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BABYLON.Engine | null>(null);
  const sceneRef = useRef<BABYLON.Scene | null>(null);
  const regionMeshesRef = useRef<Map<string, RegionMesh>>(new Map());
  const cameraRef = useRef<BABYLON.ArcRotateCamera | null>(null);
  const perfMonitorRef = useRef<{ fps: number; quality: string }>({ fps: 60, quality: 'high' });
  
  const { worldState, connected } = useWorld();
  const [isLoading, setIsLoading] = useState(true);

  // Performance monitor - auto-adjust quality
  const updatePerformance = useCallback((fps: number) => {
    const current = perfMonitorRef.current;
    current.fps = fps;
    
    if (fps < FPS_LOW && current.quality !== 'low') {
      // Reduce quality
      current.quality = 'low';
      // Reduce shadows, disable particles
      sceneRef.current?.meshes.forEach(mesh => {
        if (mesh.material && 'shadowEnabled' in mesh.material) {
          (mesh.material as any).shadowEnabled = false;
        }
      });
    } else if (fps < FPS_MEDIUM && current.quality === 'high') {
      current.quality = 'medium';
    }
  }, []);

  // Calculate LOD level based on camera distance
  const getLODLevel = useCallback((distance: number): number => {
    if (distance < LOD_DISTANCES[0]) return 2; // High detail
    if (distance < LOD_DISTANCES[1]) return 1; // Medium
    return 0; // Low detail
  }, []);

  // Mobile touch controls
  const setupMobileControls = useCallback((camera: BABYLON.ArcRotateCamera, canvas: HTMLCanvasElement) => {
    camera.pinchPrecision = 50; // Touch zoom
    camera.panningSensibility = 100;
    camera.angularSensibilityX = 500;
    camera.angularSensibilityY = 500;
    camera.useNaturalPinchZoom = true;
    
    // Multi-touch support
    camera.inputs.attached.pointers.multiTouchPanning = true;
    camera.inputs.attached.pointers.multiTouchPanAndZoom = true;
  }, []);

  // Initialize Babylon.js
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const engine = new BABYLON.Engine(canvas, true, { 
      preserveDrawingBuffer: true, 
      stencil: true,
      antialias: true 
    });
    engineRef.current = engine;

    const scene = new BABYLON.Scene(engine);
    sceneRef.current = scene;
    scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.1, 1);

    // Camera - ArcRotate for orbital view
    const camera = new BABYLON.ArcRotateCamera(
      'camera',
      Math.PI / 4,
      Math.PI / 3,
      50,
      new BABYLON.Vector3(0, 0, 0),
      scene
    );
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 10;
    camera.upperRadiusLimit = 100;
    camera.wheelPrecision = 50;
    
    // Setup mobile touch controls
    setupMobileControls(camera, canvas);
    cameraRef.current = camera;

    // Lighting
    const hemiLight = new BABYLON.HemisphericLight(
      'hemiLight',
      new BABYLON.Vector3(0, 1, 0),
      scene
    );
    hemiLight.intensity = 0.6;
    hemiLight.diffuse = new BABYLON.Color3(0.8, 0.8, 1);

    const dirLight = new BABYLON.DirectionalLight(
      'dirLight',
      new BABYLON.Vector3(-1, -2, -1),
      scene
    );
    dirLight.intensity = 0.4;

    // Create initial ground (will be updated)
    createInitialGrid(scene);

    // Start render loop with FPS monitoring
    let frameCount = 0;
    let lastTime = performance.now();
    
    engine.runRenderLoop(() => {
      scene.render();
      
      // FPS calculation every 30 frames
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        const fps = (frameCount * 1000) / (now - lastTime);
        updatePerformance(Math.round(fps));
        frameCount = 0;
        lastTime = now;
      }
    });

    // Handle resize
    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    setIsLoading(false);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.dispose();
    };
  }, []);

  // Create initial grid placeholder
  const createInitialGrid = (scene: BABYLON.Scene) => {
    // Create a base ground for reference
    const ground = BABYLON.MeshBuilder.CreateGround('baseGround', {
      width: 40,
      height: 40,
      subdivisions: 1
    }, scene);
    
    const groundMat = new BABYLON.PBRMaterial('groundMat', scene);
    groundMat.albedoColor = new BABYLON.Color3(0.1, 0.1, 0.15);
    groundMat.metallic = 0.1;
    groundMat.roughness = 0.9;
    ground.material = groundMat;
  };

  // Update region meshes when world state changes
  useEffect(() => {
    if (!worldState?.regions || !sceneRef.current) return;
    
    const scene = sceneRef.current;
    const regions = worldState.regions;
    
    // Update or create region tiles
    regions.forEach((region, index) => {
      const x = (index % 4) * 10 - 15;
      const z = Math.floor(index / 4) * 10 - 15;
      
      let regionMesh = regionMeshesRef.current.get(region.id);
      
      if (!regionMesh) {
        // Create new region tile
        const mesh = BABYLON.MeshBuilder.CreateBox(`region_${region.id}`, {
          width: 8,
          height: 1,
          depth: 8
        }, scene);
        
        mesh.position = new BABYLON.Vector3(x, 0.5, z);
        
        // Create PBR material
        const material = new BABYLON.PBRMaterial(`mat_${region.id}`, scene);
        material.albedoColor = new BABYLON.Color3(0.2, 0.8, 0.3);
        material.metallic = 0.3;
        material.roughness = 0.5;
        material.emissiveColor = new BABYLON.Color3(0, 0.1, 0);
        
        mesh.material = material;
        
        regionMesh = { id: region.id, mesh, material };
        regionMeshesRef.current.set(region.id, regionMesh);
      }
      
      // Update material based on corruption
      updateMaterial(regionMesh!, region.corruption);
    });
  }, [worldState]);

  // Update material properties based on corruption index
  const updateMaterial = (regionMesh: RegionMesh, corruption: number) => {
    const { material } = regionMesh;
    
    // Throttling: only update if corruption changed significantly (> 0.01)
    const currentRoughness = material.roughness;
    const targetRoughness = 0.5 + (corruption * 0.5);
    
    if (Math.abs(currentRoughness - targetRoughness) > 0.01) {
      // High corruption = more roughness (worn out)
      material.roughness = targetRoughness;
      
      // Desaturate color (grayscale effect)
      const saturation = 1 - corruption;
      const baseColor = new BABYLON.Color3(
        0.2 + (0.6 * saturation),
        0.8 * saturation,
        0.3 * saturation
      );
      material.albedoColor = BABYLON.Color3.Lerp(
        new BABYLON.Color3(0.3, 0.1, 0.1), // Red tint for high corruption
        baseColor,
        saturation
      );
      
      // Emissive glow for low corruption (healthy)
      material.emissiveColor = new BABYLON.Color3(
        0,
        0.1 * saturation,
        0
      );
    }
  };

  // Handle evolution events - camera pan
  useEffect(() => {
    if (!worldState?.regions || !cameraRef.current || !sceneRef.current) return;
    
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    
    // Listen for evolution events
    const handleEvolutionEvent = (e: CustomEvent) => {
      const event = e.detail;
      const regionMesh = regionMeshesRef.current.get(event.regionId);
      
      if (regionMesh) {
        const targetPos = regionMesh.mesh.position;
        
        // Smooth camera interpolation to region
        const startAlpha = camera.alpha;
        const startBeta = camera.beta;
        const startRadius = camera.radius;
        const startTarget = camera.target.clone();
        
        const targetAlpha = Math.atan2(targetPos.x, targetPos.z);
        const targetBeta = Math.PI / 3;
        const targetRadius = 25;
        
        let t = 0;
        const animate = () => {
          t += 0.02;
          if (t >= 1) {
            camera.alpha = targetAlpha;
            camera.beta = targetBeta;
            camera.radius = targetRadius;
            camera.setTarget(targetPos);
            return;
          }
          
          // Ease out interpolation
          const ease = 1 - Math.pow(1 - t, 3);
          camera.alpha = startAlpha + (targetAlpha - startAlpha) * ease;
          camera.beta = startBeta + (targetBeta - startBeta) * ease;
          camera.radius = startRadius + (targetRadius - startRadius) * ease;
          
          requestAnimationFrame(animate);
        };
        
        animate();
        
        console.log('[visualizer] Camera pan to:', event.regionId);
      }
    };
    
    window.addEventListener('evolution-alert', handleEvolutionEvent as EventListener);
    return () => window.removeEventListener('evolution-alert', handleEvolutionEvent as EventListener);
  }, [worldState]);

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
          <div className="text-cyan-400 text-xl">Loading World...</div>
        </div>
      )}
      
      <canvas 
        ref={canvasRef} 
        className="w-full h-full"
        style={{ outline: 'none' }}
      />
      
      {/* Overlay status */}
      <div className="absolute top-4 left-4 bg-gray-900/80 rounded px-3 py-2 text-sm">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-gray-300">
            {connected ? 'Live' : 'Disconnected'}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          FPS: {perfMonitorRef.current.fps} | {perfMonitorRef.current.quality}
        </div>
      </div>
      
      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 bg-gray-900/80 rounded px-3 py-2 text-xs text-gray-400">
        <div>🖱️ Drag to rotate</div>
        <div>🔍 Scroll to zoom</div>
      </div>
    </div>
  );
}

export default WorldVisualizer;