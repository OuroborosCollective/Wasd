import * as THREE from 'three';

/**
 * Specialized ShaderMaterial for atmospheric effects.
 * Supports per-instance phaseShift for InstancedMesh animations.
 */
export class AtmosphericMaterial extends THREE.ShaderMaterial {
    constructor() {
        const uniforms = {
            uEmissiveIntensity: { value: 1.0 },
            uTime: { value: 0.0 },
            uColor: { value: new THREE.Color(0x4488ff) },
            uAtmospherePower: { value: 4.0 }
        };

        super({
            uniforms,
            vertexShader: `
                attribute float phaseShift;
                varying float vPhase;
                varying vec3 vWorldNormal;
                varying vec3 vViewDir;

                void main() {
                    vPhase = phaseShift;
                    
                    // Transform position and normal using instanceMatrix for InstancedMesh support
                    vec4 worldPosition = instanceMatrix * vec4(position, 1.0);
                    vWorldNormal = normalize(mat3(instanceMatrix) * normal);
                    
                    // View direction in world space
                    vViewDir = normalize(cameraPosition - worldPosition.xyz);
                    
                    gl_Position = projectionMatrix * viewMatrix * worldPosition;
                }
            `,
            fragmentShader: `
                uniform float uEmissiveIntensity;
                uniform float uTime;
                uniform vec3 uColor;
                uniform float uAtmospherePower;
                
                varying float vPhase;
                varying vec3 vWorldNormal;
                varying vec3 vViewDir;

                void main() {
                    // Fresnel-like atmospheric glow
                    float dotProduct = dot(vWorldNormal, vViewDir);
                    float intensity = pow(1.0 - max(dotProduct, 0.0), uAtmospherePower);
                    
                    // Oscillating pulse effect using the per-instance phase shift
                    float pulse = 0.75 + 0.25 * sin(uTime * 2.5 + vPhase);
                    
                    float finalAlpha = intensity * pulse * uEmissiveIntensity;
                    vec3 finalColor = uColor * uEmissiveIntensity * pulse;
                    
                    gl_FragColor = vec4(finalColor, finalAlpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            depthWrite: false
        });
    }

    /**
     * Efficiently updates the emissive intensity uniform.
     */
    public get emissiveIntensity(): number {
        return this.uniforms.uEmissiveIntensity.value;
    }

    public set emissiveIntensity(value: number) {
        this.uniforms.uEmissiveIntensity.value = value;
    }

    /**
     * Updates the time uniform for shader animations.
     * @param time Total elapsed time in seconds.
     */
    public update(time: number): void {
        this.uniforms.uTime.value = time;
    }

    /**
     * Helper to set the base color of the atmosphere.
     */
    public set color(value: THREE.Color) {
        this.uniforms.uColor.value = value;
    }

    public get color(): THREE.Color {
        return this.uniforms.uColor.value;
    }
}