import { WebGLRenderer } from 'three';

/**
 * PlexityGate: Device Profiling & Optimization Engine
 * Part of the Areloria WASD Core for adaptive performance management.
 */

export interface DeviceProfile {
  devicePower: number; // Hardware raw capability
  dataCore: number;    // Processing efficiency
  plexityIndex: number; // Pi (0.0 - 1.0)
  tier: 'Legacy' | 'Standard' | 'Performance' | 'Ultra';
}

export interface FeatureSet {
  shaders: 'basic' | 'standard' | 'advanced' | 'cinematic';
  enableIK: boolean;
  particleBudget: number;
  shadowRes: number;
  postProcessing: boolean;
  lodDistanceModifier: number;
  targetFPS: number;
}

export class PlexityGate {
  private static instance: PlexityGate;
  private profile: DeviceProfile | null = null;
  private features: FeatureSet | null = null;

  private constructor() {}

  public static async determineOptimalRenderer(): Promise<"WEBGPU" | "WEBGL" | "DOM"> {
    return "WEBGL";
  }

  public static getInstance(): PlexityGate {
    if (!PlexityGate.instance) {
      PlexityGate.instance = new PlexityGate();
    }
    return PlexityGate.instance;
  }

  /**
   * Profiles the device based on hardware concurrency, memory, and WebGL capabilities.
   */
  public async profileDevice(renderer: WebGLRenderer): Promise<DeviceProfile> {
    const gl = renderer.getContext();
    
    // 1. Calculate DevicePower (Hardware raw stats)
    const cores = navigator.hardwareConcurrency || 4;
    // @ts-ignore - deviceMemory is not in all TS definitions yet
    const memory = navigator.deviceMemory || 4; 
    
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    const gpuName = extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : 'Generic';
    
    // Heuristic for GPU power based on max texture size
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const gpuScore = (maxTextureSize / 4096) * 2; 

    const devicePower = (cores * 0.4) + (memory * 0.3) + (gpuScore * 0.3);

    // 2. Calculate DataCore (Internal throughput estimate)
    // Low-end devices (Huawei P9 etc.) have slow bus speeds
    const isLegacyGPU = /Mali-T|Adreno \(TM\) 4|Adreno \(TM\) 5/.test(gpuName);
    const dataCore = isLegacyGPU ? 0.4 : 1.0;

    // 3. Plexity Index (Pi) calculation
    let pi = (devicePower * dataCore) / 10;
    pi = Math.min(Math.max(pi, 0.1), 1.0);

    let tier: DeviceProfile['tier'] = 'Standard';
    if (pi < 0.3) tier = 'Legacy'; // Target: Huawei P9 / iPhone 7
    else if (pi < 0.6) tier = 'Standard';
    else if (pi < 0.85) tier = 'Performance';
    else tier = 'Ultra';

    this.profile = { devicePower, dataCore, plexityIndex: pi, tier };
    this.features = this.calculateFeatureSet(this.profile);

    console.log(`[PlexityGate] Pi: ${pi.toFixed(2)} | Tier: ${tier} | GPU: ${gpuName}`);
    
    return this.profile;
  }

  /**
   * Automates feature-stripping to maintain target FPS.
   */
  private calculateFeatureSet(profile: DeviceProfile): FeatureSet {
    const pi = profile.plexityIndex;

    // Default: Legacy settings for stability (e.g. Huawei P9)
    if (profile.tier === 'Legacy' || pi < 0.3) {
      return {
        shaders: 'basic',
        enableIK: false,
        particleBudget: 150,
        shadowRes: 0, // No shadows
        postProcessing: false,
        lodDistanceModifier: 0.5,
        targetFPS: 30
      };
    }

    if (profile.tier === 'Standard') {
      return {
        shaders: 'standard',
        enableIK: true,
        particleBudget: 800,
        shadowRes: 1024,
        postProcessing: true,
        lodDistanceModifier: 1.0,
        targetFPS: 60
      };
    }

    if (profile.tier === 'Performance') {
      return {
        shaders: 'advanced',
        enableIK: true,
        particleBudget: 2500,
        shadowRes: 2048,
        postProcessing: true,
        lodDistanceModifier: 1.5,
        targetFPS: 60
      };
    }

    // Ultra Settings
    return {
      shaders: 'cinematic',
      enableIK: true,
      particleBudget: 10000,
      shadowRes: 4096,
      postProcessing: true,
      lodDistanceModifier: 2.5,
      targetFPS: 120
    };
  }

  public getFeatures(): FeatureSet {
    if (!this.features) {
      throw new Error('PlexityGate: Device not profiled yet.');
    }
    return this.features;
  }

  public getProfile(): DeviceProfile {
    if (!this.profile) {
      throw new Error('PlexityGate: Device not profiled yet.');
    }
    return this.profile;
  }
}