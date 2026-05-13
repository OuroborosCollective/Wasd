import * as BABYLON from "@babylonjs/core";

/**
 * @file BlackHoleEntropySimulation.ts
 * @mandate Sovereign AAAA+ COMPILER
 * @complexity O(1) - Deterministic Integer Logic & Memoized Lookups
 * @description Stateless Simulation Engine for Black-Hole Entropy.
 */

export interface AREPayload {
    tick: number;
    kappaPos: number;    // Deterministic 64-bit integer coordinate
    resonance: number;   // Integer: 0 to 1,000,000
    phaseShift: number;  // Integer: 0 to 1,000,000
}

export interface EntropyState {
    readonly resonanceRaw: number;
    readonly phaseRaw: number;
    readonly tickRaw: number;
    readonly kappaRaw: number;
}

/**
 * Global Cache for O(1) Material Block Access.
 * Ensures O(n) getBlockByName is only called once per block/material.
 * Caches 'null' to prevent repeated failed searches.
 */
const BLOCK_CACHE = new WeakMap<BABYLON.NodeMaterial, Map<string, BABYLON.InputBlock | null>>();

export class BlackHoleEntropySimulation {
    private static readonly KAPPA_SCALE: number = 1000000;
    // TICK_MODULO: 62832 ensures sin(tick * 0.0001) is continuous (approx 2*PI * 10)
    private static readonly TICK_MODULO: number = 62832;

    /**
     * Helper for deterministic modulo (handles negative values correctly).
     */
    private static detMod(val: number, mod: number): number {
        return ((val % mod) + mod) % mod;
    }

    /**
     * Compute State: Pure Integer Logic.
     * MANDATE: Strictly NO Floats in business logic.
     */
    public static computeState(payload: AREPayload): EntropyState {
        return {
            resonanceRaw: this.detMod(payload.resonance, this.KAPPA_SCALE + 1),
            phaseRaw: this.detMod(payload.phaseShift, this.KAPPA_SCALE + 1),
            tickRaw: this.detMod(payload.tick, this.TICK_MODULO),
            kappaRaw: this.detMod(payload.kappaPos, this.KAPPA_SCALE + 1)
        };
    }

    /**
     * Synchronizes State to GPU.
     * Complexity: O(1) via Map lookup.
     */
    public static syncShader(
        material: BABYLON.ShaderMaterial | BABYLON.NodeMaterial | null,
        payload: AREPayload
    ): void {
        if (!material) return;

        const state = this.computeState(payload);
        
        // Final Boundary: Convert to float for GPU consumption
        const fResonance = state.resonanceRaw / this.KAPPA_SCALE;
        const fPhase = state.phaseRaw / this.KAPPA_SCALE;
        const fTick = state.tickRaw; 
        const fKappa = state.kappaRaw / this.KAPPA_SCALE;

        if (material instanceof BABYLON.ShaderMaterial) {
            material.setFloat("uResonance", fResonance);
            material.setFloat("uPhaseShift", fPhase);
            material.setFloat("uTick", fTick);
            material.setFloat("uKappa", fKappa);
        } else if (material instanceof BABYLON.NodeMaterial) {
            this.updateNodeInputO1(material, "uResonance", fResonance);
            this.updateNodeInputO1(material, "uPhaseShift", fPhase);
            this.updateNodeInputO1(material, "uTick", fTick);
            this.updateNodeInputO1(material, "uKappa", fKappa);
        }
    }

    /**
     * O(1) NodeMaterial Update using Memoization.
     * Caches null for missing inputs to avoid O(n) search regressions.
     */
    private static updateNodeInputO1(material: BABYLON.NodeMaterial, name: string, value: number): void {
        let materialMap = BLOCK_CACHE.get(material);
        if (!materialMap) {
            materialMap = new Map<string, BABYLON.InputBlock | null>();
            BLOCK_CACHE.set(material, materialMap);
        }

        let block = materialMap.get(name);
        if (block === undefined) {
            const found = material.getBlockByName(name);
            block = (found instanceof BABYLON.InputBlock) ? found : null;
            materialMap.set(name, block); 
        }

        if (block !== null) {
            block.value = value;
        }
    }

    /**
     * Factory for deterministic Black Hole Shader.
     * Uses uTick with scaled sine for perfect continuity.
     */
    public static createBlackHoleMaterial(scene: BABYLON.Scene): BABYLON.ShaderMaterial {
        return new BABYLON.ShaderMaterial("OuroborosEntropy", scene, {
            vertexSource: `
                precision highp float;
                attribute vec3 position;
                attribute vec2 uv;
                uniform mat4 worldViewProjection;
                varying vec2 vUV;
                void main() {
                    vUV = uv;
                    gl_Position = worldViewProjection * vec4(position, 1.0);
                }
            `,
            fragmentSource: `
                precision highp float;
                varying vec2 vUV;
                uniform float uResonance;
                uniform float uPhaseShift;
                uniform float uTick;
                uniform float uKappa;

                void main() {
                    vec2 center = vUV - 0.5;
                    // Apply uKappa to spatial distortion (deterministic)
                    center += vec2(sin(uKappa * 6.28318), cos(uKappa * 6.28318)) * 0.05;
                    
                    float dist = length(center);
                    
                    // Continuity: 0.0001 multiplier matches TICK_MODULO 62832
                    // 62832 * 0.0001 = 6.2832 (approx 2*PI)
                    float phase = (uTick * 0.0001) + (uPhaseShift * 6.28318);
                    float pulse = sin(phase) * uResonance;
                    
                    float horizon = 0.2 + (pulse * 0.05);
                    float alpha = smoothstep(0.5, horizon, dist);
                    
                    // Entropy Color Shift
                    vec3 coreColor = vec3(0.02, 0.0, 0.05); 
                    vec3 edgeColor = vec3(0.6, 0.3, 1.0);
                    vec3 finalColor = mix(coreColor, edgeColor, pulse * 0.5 + 0.5);
                    
                    gl_FragColor = vec4(finalColor * (1.0 - dist), alpha);
                }
            `
        }, {
            attributes: ["position", "uv"],
            uniforms: ["worldViewProjection", "uResonance", "uPhaseShift", "uTick", "uKappa"]
        });
    }
}