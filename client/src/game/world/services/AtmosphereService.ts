/**
 * AtmosphereService — Wraps Babylon.js v7.x compatible sky and atmospheric effects.
 * Replaces the legacy Atmosphere addon with SkyMaterial and synchronized environmental lighting.
 */

import { 
  Scene, 
  Color3, 
  Vector3, 
  DirectionalLight, 
  Light, 
  MeshBuilder, 
  Mesh,
  StandardMaterial,
  Nullable
} from "@babylonjs/core";
import { SkyMaterial } from "@babylonjs/materials/sky/skyMaterial";

export interface AtmosphereConfig {
  sunDirection: Vector3;
  sunIntensity: number;
  groundAlbedo: number;
  atmosphereDensity: number;
  sunAngularRadius: number;
  skyTurbidity: number;
  skyLuminance: number;
}

const DEFAULT_CONFIG: AtmosphereConfig = {
  sunDirection: new Vector3(0, 1, 0),
  sunIntensity: 1.5,
  groundAlbedo: 0.3,
  atmosphereDensity: 1.0,
  sunAngularRadius: 0.00935,
  skyTurbidity: 10,
  skyLuminance: 1.0,
};

export class AtmosphereService {
  private scene: Nullable<Scene> = null;
  private skyBox: Nullable<Mesh> = null;
  private skyMaterial: Nullable<SkyMaterial> = null;
  private config: AtmosphereConfig;
  private initialized = false;
  private timeOfDay = 0.5; // 0=midnight, 0.5=noon, 1=midnight

  constructor(config?: Partial<AtmosphereConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initializes the atmosphere using SkyMaterial (Babylon.js 7.x recommended approach).
   */
  async init(scene: Scene): Promise<void> {
    if (this.initialized) return;
    this.scene = scene;

    try {
      // Create SkyBox
      this.skyBox = MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, scene);
      this.skyMaterial = new SkyMaterial("skyMaterial", scene);
      this.skyMaterial.backFaceCulling = false;
      
      // Apply initial config
      this.skyMaterial.turbidity = this.config.skyTurbidity;
      this.skyMaterial.luminance = this.config.skyLuminance;
      
      this.skyBox.material = this.skyMaterial;
      this.skyBox.infiniteDistance = true;

      // Ensure fog is enabled for atmospheric depth
      scene.fogMode = Scene.FOGMODE_EXP2;
      scene.fogDensity = 0.002;

      console.log("[AtmosphereService] Initialized with SkyMaterial for Babylon.js 7.x");
    } catch (e) {
      console.error("[AtmosphereService] Error initializing atmosphere:", e);
      this.setupFallbackSky();
    }

    this.initialized = true;
    this.setTimeOfDay(0.5); // Default to noon
  }

  /** 
   * Set time of day (0-1, where 0.5 is noon).
   * Maps time to sun inclination and azimuth for the SkyMaterial.
   */
  setTimeOfDay(t: number): void {
    this.timeOfDay = ((t % 1) + 1) % 1;

    if (!this.scene || !this.skyMaterial) return;

    // Calculate sun position based on time
    // 0.0 -> Midnight (-PI/2)
    // 0.5 -> Noon (PI/2)
    // 1.0 -> Midnight (1.5 * PI)
    const angle = (this.timeOfDay * 2 * Math.PI) - (Math.PI / 2);
    
    // Calculate sun direction vector
    const sunDir = new Vector3(
      0,
      Math.sin(angle),
      -Math.cos(angle)
    ).normalize();

    this.config.sunDirection = sunDir;

    // Update SkyMaterial
    // inclination: 0.5 is sunset/sunrise, 0 is noon
    // We map our angle logic to SkyMaterial's expectations
    this.skyMaterial.inclination = (0.5 - (Math.sin(angle) * 0.5)); 
    this.skyMaterial.azimuth = 0.25; 

    // Adjust light intensity based on sun height
    const sunHeight = Math.max(0, sunDir.y);
    const lightIntensity = sunHeight * this.config.sunIntensity;

    // Update scene directional lights
    const dirLights = this.scene.lights.filter(
      (l) => l.getTypeID() === Light.LIGHTTYPEID_DIRECTIONALLIGHT
    ) as DirectionalLight[];

    dirLights.forEach((light) => {
      light.direction = sunDir.scale(-1);
      light.intensity = Math.max(0.1, lightIntensity);
      
      // Change light color based on sun height (warm at sunset)
      if (sunHeight < 0.2) {
        light.diffuse = new Color3(1, 0.6 + sunHeight * 2, 0.4 + sunHeight * 2);
      } else {
        light.diffuse = new Color3(1, 1, 1);
      }
    });

    // Update fog color to match atmosphere
    const skyColor = sunHeight > 0 
      ? new Color3(0.5, 0.7, 1.0).scale(sunHeight) 
      : new Color3(0.05, 0.05, 0.1);
    
    this.scene.fogColor = skyColor;
    this.scene.clearColor = skyColor.toColor4(1);
  }

  getTimeOfDay(): number {
    return this.timeOfDay;
  }

  getSunDirection(): Vector3 {
    return this.config.sunDirection;
  }

  setFogDensity(density: number): void {
    if (!this.scene) return;
    this.scene.fogDensity = density;
  }

  private setupFallbackSky(): void {
    if (!this.scene) return;
    this.scene.clearColor = new Color3(0.1, 0.1, 0.2).toColor4(1);
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.005;
    this.scene.fogColor = new Color3(0.1, 0.1, 0.2);
  }

  isActive(): boolean {
    return this.initialized;
  }

  dispose(): void {
    if (this.skyBox) {
      this.skyBox.dispose();
      this.skyBox = null;
    }
    if (this.skyMaterial) {
      this.skyMaterial.dispose();
      this.skyMaterial = null;
    }
    this.scene = null;
    this.initialized = false;
  }
}

export const atmosphereService = new AtmosphereService();