import * as THREE from 'three';

export interface ResonanceNode {
    id: string;
    position: THREE.Vector3;
    duration: number;
    maxDuration: number;
    intensity: number;
}

export class ResonanceOverlay {
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private nodeUIs: Map<string, THREE.Group> = new Map();
    private linkMaterials: THREE.ShaderMaterial[] = [];
    private globalResonance: number = 0;

    constructor(scene: THREE.Scene, camera: THREE.Camera) {
        this.scene = scene;
        this.camera = camera;
    }

    public update(nodes: ResonanceNode[], resonanceLevel: number): void {
        this.globalResonance = resonanceLevel;
        const activeIds = new Set(nodes.map(n => n.id));

        // Cleanup expired nodes
        for (const [id, group] of this.nodeUIs.entries()) {
            if (!activeIds.has(id)) {
                this.scene.remove(group);
                this.nodeUIs.delete(id);
            }
        }

        // Update or create nodes
        nodes.forEach(node => {
            let group = this.nodeUIs.get(node.id);
            if (!group) {
                group = this.createNodeUI();
                this.nodeUIs.set(node.id, group);
                this.scene.add(group);
            }
            this.updateNodeTransform(group, node);
            this.drawNodeCanvas(group, node);
        });

        this.updateShaderParameters();
    }

    public addLinkMaterial(material: THREE.ShaderMaterial): void {
        this.linkMaterials.push(material);
    }

    private createNodeUI(): THREE.Group {
        const group = new THREE.Group();
        
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture, 
            transparent: true,
            depthTest: false 
        });
        
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1.5, 0.75, 1);
        
        group.add(sprite);
        group.userData = { canvas, texture, material };
        
        return group;
    }

    private updateNodeTransform(group: THREE.Group, node: ResonanceNode): void {
        group.position.copy(node.position).add(new THREE.Vector3(0, 1.2, 0));
        group.lookAt(this.camera.position);
    }

    private drawNodeCanvas(group: THREE.Group, node: ResonanceNode): void {
        const data = group.userData;
        const ctx = data.canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, 256, 128);

        // Background Box
        ctx.fillStyle = 'rgba(10, 20, 30, 0.8)';
        ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 + node.intensity * 0.7})`;
        ctx.lineWidth = 4;
        this.roundRect(ctx, 10, 40, 236, 60, 10);
        ctx.fill();
        ctx.stroke();

        // Duration Bar Background
        ctx.fillStyle = 'rgba(50, 50, 50, 0.5)';
        ctx.fillRect(20, 80, 216, 12);

        // Duration Bar Fill
        const durationRatio = node.duration / node.maxDuration;
        const colorHue = 180 + (node.intensity * 60); // Shifts from Cyan to Magenta
        ctx.fillStyle = `hsl(${colorHue}, 100%, 60%)`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsl(${colorHue}, 100%, 50%)`;
        ctx.fillRect(20, 80, 216 * durationRatio, 12);
        ctx.shadowBlur = 0;

        // Intensity Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`RESONANCE: ${(node.intensity * 100).toFixed(0)}%`, 128, 70);

        data.texture.needsUpdate = true;
    }

    private updateShaderParameters(): void {
        const time = performance.now() * 0.001;
        this.linkMaterials.forEach(mat => {
            if (mat.uniforms.uResonance) {
                mat.uniforms.uResonance.value = this.globalResonance;
            }
            if (mat.uniforms.uTime) {
                mat.uniforms.uTime.value = time;
            }
            if (mat.uniforms.uIntensity) {
                mat.uniforms.uIntensity.value = 1.0 + Math.pow(this.globalResonance, 2) * 5.0;
            }
        });
    }

    private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    public static getLinkShaderDefinition() {
        return {
            uniforms: {
                uTime: { value: 0 },
                uResonance: { value: 0 },
                uIntensity: { value: 1.0 },
                uColor: { value: new THREE.Color(0x00ffff) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform float uResonance;
                uniform float uIntensity;
                uniform vec3 uColor;
                varying vec2 vUv;
                void main() {
                    float pulse = sin(uTime * 10.0 + vUv.x * 20.0) * 0.5 + 0.5;
                    float alpha = smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
                    float flow = fract(vUv.x - uTime * (1.0 + uResonance * 3.0));
                    float glow = pow(1.0 - abs(vUv.y - 0.5) * 2.0, 3.0 + (1.0 - uResonance) * 5.0);
                    
                    vec3 color = mix(uColor, vec3(1.0, 0.2, 0.8), uResonance);
                    float finalAlpha = alpha * glow * (0.3 + pulse * 0.2 + flow * 0.5) * uIntensity;
                    
                    gl_FragColor = vec4(color * uIntensity, finalAlpha);
                }
            `
        };
    }
}