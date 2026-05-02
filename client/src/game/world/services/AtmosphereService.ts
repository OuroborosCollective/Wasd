/**
 * AtmosphereService — Wraps @babylonjs/addons atmosphere for the game.
 * Enhances sky, fog, distant terrain integration.
 *
 * Docs: https://doc.babylonjs.com/addons/atmosphere/
 */

import { Scene, Color3, Vector3, DirectionalLight, Light } from "@babylonjs/core";

export interface AtmosphereConfig {
  sunDirection: Vector3;
  sunIntensity: number;
  groundAlbedo: number;
  atmosphereDensity: number;
  sunAngularRadius: number;
  skyTurbidity: number;
}

const DEFAULT_CONFIG: AtmosphereConfig = {
  sunDirection: new Vector3(0.5, 0.8, 0.3).normalize(),
  sunIntensity: 20,
  groundAlbedo: 0.3,
  atmosphereDensity: 1,
  sunAngularRadius: 0.00935,
  skyTurbidity: 2,
};

export class AtmosphereService {
  private scene: Scene | null = null;
  private atmosphereInstance: any = null;
  private config: AtmosphereConfig;
  private initialized = false;
  private timeOfDay = 0.5; // 0=midnight, 0.5=noon, 1=midnight

  constructor(config?: Partial<AtmosphereConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async init(scene: Scene): Promise<void> {
    if (this.initialized) return;
    this.scene = scene;

    try {
      const addons = await import("@babylonjs/addons");
      if (addons.Atmosphere) {
        // Find existing directional lights to pass to the Atmosphere constructor
        const directionalLights = scene.lights.filter(
          (l) => l.getTypeID() === Light.LIGHTTYPEID_DIRECTIONALLIGHT
        ) as DirectionalLight[];

        // Atmosphere addon expects an array of DirectionalLights as the 3rd argument
        this.atmosphereInstance = new addons.Atmosphere("atmosphere", scene, directionalLights);
        
        // Apply remaining configuration via properties
        this.atmosphereInstance.sunIntensity = this.config.sunIntensity;
        this.atmosphereInstance.skyTurbidity = this.config.skyTurbidity;
        this.atmosphereInstance.groundAlbedo = this.config.groundAlbedo;
        
        scene.clearColor = new Color3(0.53, 0.81, 0.92).toColor4(1);
        console.log("[AtmosphereService] Atmosphere addon initialized with lights array.");
      } else {
        console.log("[AtmosphereService] Atmosphere addon not available, using fallback sky.");
        this.setupFallbackSky();
      }
    } catch (e) {
      console.error("[AtmosphereService] Error loading atmosphere addon:", e);
      this.setupFallbackSky();
    }

    this.initialized = true;
  }

  /** Set time of day (0-1, where 0.5 is noon). */
  setTimeOfDay(t: number): void {
    this.timeOfDay = ((t % 1) + 1) % 1;

    if (!this.scene) return;

    // Simple day/night cycle via sun direction
    const angle = this.timeOfDay * Math.PI * 2;
    this.config.sunDirection = new Vector3(
      Math.cos(angle),
      Math.sin(angle),
      0.3
    ).normalize();

    // Adjust ambient light and directional light based on time
    const sunHeight = Math.sin(angle);
    const brightness = Math.max(0.05, sunHeight);

    // Update all directional lights associated with the sun
    const dirLights = this.scene.lights.filter(
      (l) => l.getTypeID() === Light.LIGHTTYPEID_DIRECTIONALLIGHT
    ) as DirectionalLight[];

    dirLights.forEach((light) => {
      light.direction = this.config.sunDirection.scale(-1);
      light.intensity = brightness * 1.5;
    });

    // Update atmosphere instance if available
    if (this.atmosphereInstance) {
      // The addon usually tracks the light direction from the light array provided at init
      // but we can manually trigger updates or sync properties if required.
      if (this.atmosphereInstance.sunDirection) {
        this.atmosphereInstance.sunDirection = this.config.sunDirection;
      }
    }

    // Fog color matches sky
    const fogR = 0.53 * brightness;
    const fogG = 0.81 * brightness;
    const fogB = 0.92 * brightness;
    this.scene.fogColor = new Color3(fogR, fogG, fogB);
  }

  /** Get current time of day. */
  getTimeOfDay(): number {
    return this.timeOfDay;
  }

  /** Update sun direction for DynamicTerrain lighting. */
  getSunDirection(): Vector3 {
    return this.config.sunDirection;
  }

  /** Set fog density. */
  setFogDensity(density: number): void {
    if (!this.scene) return;
    this.scene.fogDensity = density;
  }

  private setupFallbackSky(): void {
    if (!this.scene) return;
    this.scene.clearColor = new Color3(0.53, 0.81, 0.92).toColor4(1);
    this.scene.fogMode = 2; // FOGMODE_EXP2
    this.scene.fogDensity = 0.002;
    this.scene.fogColor = new Color3(0.7, 0.8, 0.9);
  }

  isActive(): boolean {
    return this.initialized;
  }

  dispose(): void {
    if (this.atmosphereInstance && typeof this.atmosphereInstance.dispose === "function") {
      this.atmosphereInstance.dispose();
    }
    this.atmosphereInstance = null;
    this.scene = null;
    this.initialized = false;
  }
}

export const atmosphereService = new AtmosphereService();