import { 
    Scene, 
    MeshBuilder, 
    HemisphericLight, 
    Vector3, 
    Color3, 
    Mesh, 
    DirectionalLight,
    ShadowGenerator
} from '@babylonjs/core';
import { SkyMaterial } from '@babylonjs/materials/sky';

export interface AtmosphereConfig {
    turbidity: number;
    luminance: number;
    inclination: number;
    azimuth: number;
    mieCoefficient: number;
    mieDirectionalG: number;
    rayleigh: number;
}

/**
 * AtmosphereService handles the environmental rendering including SkyBox, 
 * dynamic lighting (Sun), and fog effects for the Areloria WASD world.
 */
export class AtmosphereService {
    private scene: Scene;
    private skybox: Mesh | null = null;
    private skyMaterial: SkyMaterial | null = null;
    private sunLight: DirectionalLight | null = null;
    private ambientLight: HemisphericLight | null = null;
    private shadowGenerator: ShadowGenerator | null = null;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    /**
     * Initializes the atmosphere components
     */
    public initialize(): void {
        this.setupSkybox();
        this.setupLights();
        this.setupFog();
    }

    private setupSkybox(): void {
        this.skybox = MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, this.scene);
        this.skyMaterial = new SkyMaterial("skyMaterial", this.scene);
        this.skyMaterial.backFaceCulling = false;

        // Default "Clear Day" Settings
        this.skyMaterial.turbidity = 10;
        this.skyMaterial.luminance = 1;
        this.skyMaterial.inclination = 0.5; // Noonish
        this.skyMaterial.azimuth = 0.25;
        this.skyMaterial.rayleigh = 2;
        this.skyMaterial.mieCoefficient = 0.005;
        this.skyMaterial.mieDirectionalG = 0.8;

        this.skybox.material = this.skyMaterial;
        this.skybox.infiniteDistance = true;
    }

    private setupLights(): void {
        // Ambient light for general visibility
        this.ambientLight = new HemisphericLight(
            "ambientLight",
            new Vector3(0, 1, 0),
            this.scene
        );
        this.ambientLight.intensity = 0.7;
        this.ambientLight.groundColor = new Color3(0.2, 0.2, 0.3);

        // Sun light
        this.sunLight = new DirectionalLight(
            "sunLight",
            new Vector3(-1, -2, -1),
            this.scene
        );
        this.sunLight.position = new Vector3(20, 40, 20);
        this.sunLight.intensity = 1.2;

        // Shadow configuration
        this.shadowGenerator = new ShadowGenerator(1024, this.sunLight);
        this.shadowGenerator.useBlurExponentialShadowMap = true;
        this.shadowGenerator.blurKernel = 32;
    }

    private setupFog(): void {
        this.scene.fogMode = Scene.FOGMODE_EXP2;
        this.scene.fogDensity = 0.002;
        this.scene.fogColor = new Color3(0.8, 0.9, 1.0);
    }

    /**
     * Updates the sun position and sky material based on inclination
     * @param inclination Value from -0.5 (midnight) to 0.5 (noon)
     */
    public updateTimeOfDay(inclination: number): void {
        if (!this.skyMaterial || !this.sunLight) return;

        this.skyMaterial.inclination = inclination;
        
        // Update sun light direction based on sky inclination
        const theta = Math.PI * (inclination - 0.5);
        const phi = 2 * Math.PI * (this.skyMaterial.azimuth - 0.5);

        this.sunLight.direction.x = Math.cos(phi);
        this.sunLight.direction.y = Math.sin(phi) * Math.sin(theta);
        this.sunLight.direction.z = Math.sin(phi) * Math.cos(theta);

        // Adjust intensity based on height (night/day)
        const sunHeight = this.sunLight.direction.y;
        this.sunLight.intensity = Math.max(0, sunHeight + 0.5) * 1.5;
        
        if (this.ambientLight) {
            this.ambientLight.intensity = Math.max(0.2, sunHeight + 0.3);
        }
    }

    /**
     * Applies custom atmospheric configurations
     */
    public setAtmosphereConfig(config: Partial<AtmosphereConfig>): void {
        if (!this.skyMaterial) return;

        if (config.turbidity !== undefined) this.skyMaterial.turbidity = config.turbidity;
        if (config.luminance !== undefined) this.skyMaterial.luminance = config.luminance;
        if (config.inclination !== undefined) this.skyMaterial.inclination = config.inclination;
        if (config.azimuth !== undefined) this.skyMaterial.azimuth = config.azimuth;
        if (config.mieCoefficient !== undefined) this.skyMaterial.mieCoefficient = config.mieCoefficient;
        if (config.mieDirectionalG !== undefined) this.skyMaterial.mieDirectionalG = config.mieDirectionalG;
        if (config.rayleigh !== undefined) this.skyMaterial.rayleigh = config.rayleigh;
    }

    public getSunLight(): DirectionalLight | null {
        return this.sunLight;
    }

    public getShadowGenerator(): ShadowGenerator | null {
        return this.shadowGenerator;
    }

    public dispose(): void {
        this.skybox?.dispose();
        this.skyMaterial?.dispose();
        this.sunLight?.dispose();
        this.ambientLight?.dispose();
    }
}