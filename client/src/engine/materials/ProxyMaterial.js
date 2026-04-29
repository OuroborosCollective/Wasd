import * as THREE from 'three';

export class ProxyMaterial extends THREE.MeshStandardMaterial {
    constructor(parameters = {}) {
        const defaults = {
            color: 0x00ffcc,
            transparent: true,
            opacity: 0.8,
            emissive: 0x004444,
            emissiveIntensity: 0.5,
            roughness: 0.5,
            metalness: 0.5,
            side: THREE.DoubleSide
        };

        const config = { ...defaults, ...parameters };
        super(config);
    }

    updateGlow(intensity) {
        this.emissiveIntensity = intensity;
    }
}