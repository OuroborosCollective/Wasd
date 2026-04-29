import * as THREE from 'three';

export class BioLuminescentMaterial extends THREE.ShaderMaterial {
  constructor() {
    const MAX_PHASE_CONSTANT = 100.0;

    super({
      uniforms: {
        u_time: { value: 0.0 },
        u_phaseShift: { value: 0.0 },
        u_glowColor: { value: new THREE.Color(0x00ff88) },
        u_baseTexture: { value: null }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float u_time;
        uniform float u_phaseShift;
        uniform vec3 u_glowColor;
        uniform sampler2D u_baseTexture;

        varying vec2 vUv;
        varying vec3 vNormal;

        #define PI 3.14159265358979323846
        #define MAX_PHASE_CONSTANT ${MAX_PHASE_CONSTANT.toFixed(1)}

        void main() {
          float intensity = 0.5 + 0.5 * sin(u_time + (u_phaseShift * 2.0 * PI / MAX_PHASE_CONSTANT));
          
          vec4 texColor = texture2D(u_baseTexture, vUv);
          
          // Fresnel effect for more natural biological glow
          float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
          
          vec3 finalGlow = u_glowColor * intensity * (1.0 + fresnel);
          
          // Apply glow to the RGB channels of the texture
          gl_FragColor = vec4(texColor.rgb * finalGlow, texColor.a);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
  }

  update(time: number, phaseShift?: number) {
    this.uniforms.u_time.value = time;
    if (phaseShift !== undefined) {
      this.uniforms.u_phaseShift.value = phaseShift;
    }
  }
}