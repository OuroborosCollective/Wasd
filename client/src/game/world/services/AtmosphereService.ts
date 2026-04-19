/**
 * AtmosphereService — Wraps @babylonjs/addons atmosphere for the game.
 * Enhances sky, fog, distant terrain integration.
 *
 * Docs: https://doc.babylonjs.com/addons/atmosphere/
 */

import { Scene, Color3, Vector3 } from "@babylonjs/core";

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
      // Try to load the atmosphere addon
      const addons = await import("@babylonjs/addons");
      if (addons.Atmosphere) {
        const atmosphere = new addons.Atmosphere(scene);
        // Configure
        scene.clearColor = new Color3(0.53, 0.81, 0.92).toColor4(1);
        console.log("[AtmosphereService] Atmosphere addon initialized.");
      } else {
        console.log("[AtmosphereService] Atmosphere addon not available, using fallback sky.");
        this.setupFallbackSky();
      }
    } catch {
      console.log("[AtmosphereService] Atmosphere addon not available, using fallback sky.");
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

    // Adjust ambient light based on time
    const sunHeight = Math.sin(angle);
    const brightness = Math.max(0.05, sunHeight);

    const hemiLight = this.scene.lights.find((l) => l.name === "__default__light__");
    if (hemiLight) {
      hemiLight.intensity = brightness * 1.2;
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
    this.initialized = false;
  }
}

export const atmosphereService = new AtmosphereService();
