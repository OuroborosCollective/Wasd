/**
 * Example: Using DynamicTerrain in the Wasd project.
 *
 * DynamicTerrain creates a LOD-based terrain mesh that follows the camera,
 * useful for infinite open-world terrain with heightmaps.
 *
 * Usage:
 *   import { createDynamicTerrain } from "./dynamicTerrainExample";
 *   const terrain = createDynamicTerrain(scene, camera, "/assets/heightmap.png");
 */
import { Scene, Camera, StandardMaterial, Texture, Color3 } from "@babylonjs/core";
import { DynamicTerrain, type IDynamicTerrain } from "./DynamicTerrain";

/**
 * Create a DynamicTerrain from a heightmap image.
 * The terrain follows the camera and adjusts LOD automatically.
 */
export function createDynamicTerrain(
  scene: Scene,
  camera: Camera,
  heightmapUrl: string,
  options?: {
    /** World width of the terrain map (default 300) */
    width?: number;
    /** World height/depth of the terrain map (default 300) */
    height?: number;
    /** Number of subdivisions along X (default 100) */
    subX?: number;
    /** Number of subdivisions along Z (default 100) */
    subZ?: number;
    /** Number of terrain mesh subdivisions (default 60, must be multiple of 2) */
    terrainSub?: number;
    /** Minimum height (default 0) */
    minHeight?: number;
    /** Maximum height (default 10) */
    maxHeight?: number;
    /** Material diffuse texture URL (optional) */
    diffuseTextureUrl?: string;
  }
): Promise<IDynamicTerrain> {
  const width = options?.width ?? 300;
  const height = options?.height ?? 300;
  const subX = options?.subX ?? 100;
  const subZ = options?.subZ ?? 100;
  const terrainSub = options?.terrainSub ?? 60;
  const minHeight = options?.minHeight ?? 0;
  const maxHeight = options?.maxHeight ?? 10;

  return new Promise((resolve) => {
    // CreateMapFromHeightMap is async — it loads the image and calls onReady
    DynamicTerrain.CreateMapFromHeightMap(
      heightmapUrl,
      {
        width,
        height,
        subX,
        subZ,
        minHeight,
        maxHeight,
        offsetX: 0,
        offsetZ: 0,
        onReady: (mapData, mapSubX, mapSubZ) => {
          const terrain = new DynamicTerrain(
            "world-terrain",
            {
              mapData,
              mapSubX,
              mapSubZ,
              terrainSub,
              camera,
            },
            scene
          );

          // Apply material
          const mat = new StandardMaterial("terrain-mat", scene);
          mat.diffuseColor = new Color3(0.45, 0.55, 0.35);
          mat.specularColor = new Color3(0.05, 0.05, 0.05);

          if (options?.diffuseTextureUrl) {
            mat.diffuseTexture = new Texture(options.diffuseTextureUrl, scene);
          }

          terrain.mesh.material = mat;
          terrain.computeNormals = true;

          // Update terrain every frame (follows camera)
          scene.onBeforeRenderObservable.add(() => {
            terrain.update(false);
          });

          resolve(terrain);
        },
      },
      scene
    );
  });
}

/**
 * Generate procedural heightmap data (no image needed).
 * Returns flat Float32Array of x,y,z positions.
 */
export function generateProceduralHeightmap(
  subX: number,
  subZ: number,
  width: number,
  height: number,
  amplitude: number = 5
): Float32Array {
  const data = new Float32Array(subX * subZ * 3);
  const halfW = width / 2;
  const halfH = height / 2;

  for (let j = 0; j < subZ; j++) {
    for (let i = 0; i < subX; i++) {
      const idx = (j * subX + i) * 3;
      const x = -halfW + (i / (subX - 1)) * width;
      const z = -halfH + (j / (subZ - 1)) * height;
      // Simple procedural height using sin waves
      const y =
        Math.sin(x * 0.05) * Math.cos(z * 0.05) * amplitude +
        Math.sin(x * 0.1 + z * 0.08) * amplitude * 0.5 +
        Math.sin(x * 0.02) * amplitude * 2;

      data[idx] = x;
      data[idx + 1] = y;
      data[idx + 2] = z;
    }
  }

  return data;
}

/**
 * Create a DynamicTerrain from procedural heightmap data.
 */
export function createProceduralTerrain(
  scene: Scene,
  camera: Camera,
  options?: {
    width?: number;
    height?: number;
    subX?: number;
    subZ?: number;
    terrainSub?: number;
    amplitude?: number;
  }
): IDynamicTerrain {
  const width = options?.width ?? 200;
  const height = options?.height ?? 200;
  const subX = options?.subX ?? 100;
  const subZ = options?.subZ ?? 100;
  const terrainSub = options?.terrainSub ?? 60;
  const amplitude = options?.amplitude ?? 5;

  const mapData = generateProceduralHeightmap(subX, subZ, width, height, amplitude);

  const terrain = new DynamicTerrain(
    "procedural-terrain",
    {
      mapData,
      mapSubX: subX,
      mapSubZ: subZ,
      terrainSub,
      camera,
    },
    scene
  );

  const mat = new StandardMaterial("proc-terrain-mat", scene);
  mat.diffuseColor = new Color3(0.35, 0.45, 0.3);
  mat.specularColor = new Color3(0.02, 0.02, 0.02);
  terrain.mesh.material = mat;
  terrain.computeNormals = true;

  scene.onBeforeRenderObservable.add(() => {
    terrain.update(false);
  });

  return terrain;
}
