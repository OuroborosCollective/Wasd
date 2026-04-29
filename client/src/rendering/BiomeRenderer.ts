import * as THREE from 'three';

interface AREPayload {
    resonance: number;
    timestamp: number;
    [key: string]: any;
}

export class BiomeRenderer {
    private materials: THREE.ShaderMaterial[] = [];
    private currentResonance: number = 0;

    constructor() {}

    public registerMaterial(material: THREE.ShaderMaterial): void {
        if (!material.uniforms.uResonance) {
            material.uniforms.uResonance = { value: 0.0 };
        }
        if (!material.uniforms.uTime) {
            material.uniforms.uTime = { value: 0.0 };
        }
        this.materials.push(material);
    }

    public updateFromPayload(payload: AREPayload): void {
        if (payload && typeof payload.resonance === 'number') {
            this.currentResonance = payload.resonance;
        }
    }

    public render(time: number): void {
        this.materials.forEach(material => {
            material.uniforms.uTime.value = time;
            material.uniforms.uResonance.value = this.currentResonance;
        });
    }

    public static getBiomeVertexShaderChunk(): string {
        return `
            uniform float uTime;
            uniform float uResonance;

            varying vec2 vUv;

            vec3 applyWind(vec3 position, float strength) {
                float wave = sin(uTime * uResonance + position.x * 2.0 + position.z * 2.0) * strength;
                position.x += wave * (position.y * 0.1); 
                position.z += wave * (position.y * 0.1);
                return position;
            }
        `;
    }

    public createBiomeShaderMaterial(config: { vertexShader: string, fragmentShader: string, uniforms?: any }): THREE.ShaderMaterial {
        const material = new THREE.ShaderMaterial({
            uniforms: THREE.UniformsUtils.merge([
                {
                    uTime: { value: 0 },
                    uResonance: { value: 0 }
                },
                config.uniforms || {}
            ]),
            vertexShader: config.vertexShader,
            fragmentShader: config.fragmentShader
        });

        this.registerMaterial(material);
        return material;
    }

    public dispose(): void {
        this.materials = [];
    }
}