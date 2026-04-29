import * as THREE from 'three';

export interface AREPayload {
    resonance: number;
    timestamp: number;
    entities: any[];
    environment: {
        windIntensity: number;
        waveAmplitude: number;
    };
}

export class BiomeRenderer {
    private registeredMaterials: Set<THREE.ShaderMaterial> = new Set();
    private lastResonance: number = 0;

    constructor() {}

    /**
     * Registers a shader material to be synchronized with the server resonance clock.
     * @param material The THREE.ShaderMaterial to track.
     */
    public registerMaterial(material: THREE.ShaderMaterial): void {
        this.registeredMaterials.add(material);
    }

    /**
     * Unregisters a shader material.
     * @param material The material to remove.
     */
    public unregisterMaterial(material: THREE.ShaderMaterial): void {
        this.registeredMaterials.delete(material);
    }

    /**
     * Extracts resonance from AREPayload and updates all registered shader uniforms.
     * This ensures frame-perfect synchronization of procedural animations across clients.
     * @param payload The incoming AREPayload from the server.
     */
    public processAREPayload(payload: AREPayload): void {
        const { resonance } = payload;
        
        if (resonance === undefined || resonance === null) return;
        
        this.lastResonance = resonance;
        this.applyGlobalUniforms(resonance);
    }

    /**
     * Updates the uniforms based on the resonance value.
     * Uses mathematical constants to derive specific movement phases without extra network data.
     * @param resonance The base synchronization value (server-side tick or high-res timestamp).
     */
    private applyGlobalUniforms(resonance: number): void {
        this.registeredMaterials.forEach(material => {
            if (!material.uniforms) return;

            // Global Resonance: Raw server pulse
            if (material.uniforms.u_resonance) {
                material.uniforms.u_resonance.value = resonance;
            }

            // Wind Motion: Low frequency oscillation for foliage and grass
            // Formula: sin(resonance * frequency + phase)
            if (material.uniforms.u_wind_oscillation) {
                material.uniforms.u_wind_oscillation.value = Math.sin(resonance * 0.0015);
            }

            // Grass Sway: Complex sway pattern using interference of two sine waves derived from resonance
            if (material.uniforms.u_grass_sway) {
                const sway = (Math.sin(resonance * 0.002) + Math.sin(resonance * 0.0008)) * 0.5;
                material.uniforms.u_grass_sway.value = sway;
            }

            // Wave Synchronization: Precise phase for water vertex displacement
            if (material.uniforms.u_wave_sync) {
                // Modulo ensures we stay within 0-2PI range for precision
                material.uniforms.u_wave_sync.value = resonance % (Math.PI * 2000);
            }

            // Micro-Jitter: High frequency resonance for atmospheric particles
            if (material.uniforms.u_jitter) {
                material.uniforms.u_jitter.value = Math.fract(Math.sin(resonance) * 43758.5453123);
            }
        });
    }

    /**
     * Fallback update loop for client-side interpolation between server payloads.
     * @param deltaTime Time since last frame.
     */
    public update(deltaTime: number): void {
        // Interpolation or extrapolation can be added here if resonance requires smoothing
        // Currently relying on discrete AREPayload updates for exact server-state mirroring.
    }
}

/**
 * Utility function to handle fractional component of a number (GLSL equivalent)
 */
if (!(Math as any).fract) {
    (Math as any).fract = function(num: number): number {
        return num - Math.floor(num);
    };
}

export default BiomeRenderer;