export class GuardianController {
    private gl: WebGLRenderingContext;
    private program: WebGLProgram;
    private positionBuffer: WebGLBuffer;
    private startTime: number;
    private entropy: number = 0.0;
    private canvas: HTMLCanvasElement;

    private readonly vsSource: string = `
        attribute vec4 a_position;
        void main() {
            gl_Position = a_position;
        }
    `;

    private readonly fsSource: string = `
        precision highp float;
        uniform float u_time;
        uniform float u_entropy;
        uniform vec2 u_resolution;

        mat2 rot(float a) {
            float s = sin(a), c = cos(a);
            return mat2(c, -s, s, c);
        }

        float sdTorus(vec3 p, vec2 t) {
            vec2 q = vec2(length(p.xz) - t.x, p.y);
            return length(q) - t.y;
        }

        float map(vec3 p) {
            float d = sdTorus(p, vec2(0.6, 0.2));
            
            // Entropy deformation logic
            // As u_entropy -> 0.0, displacement -> 0.0 (Stabilization)
            float displacement = sin(p.x * 10.0 + u_time) * 
                                 cos(p.y * 10.0 + u_time) * 
                                 sin(p.z * 10.0 + u_time) * (u_entropy * 0.15);
            
            // Circular ripple distortion
            float ripple = sin(length(p) * 20.0 - u_time * 2.0) * (u_entropy * 0.05);
            
            return d + displacement + ripple;
        }

        void main() {
            vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
            vec3 ro = vec3(0.0, 0.0, 2.0);
            vec3 rd = normalize(vec3(uv, -1.0));
            
            float t = 0.0;
            for(int i = 0; i < 64; i++) {
                vec3 p = ro + rd * t;
                p.xy *= rot(u_time * 0.2);
                p.xz *= rot(u_time * 0.3);
                float d = map(p);
                if(d < 0.001 || t > 10.0) break;
                t += d;
            }

            vec3 col = vec3(0.0);
            if(t < 10.0) {
                vec3 p = ro + rd * t;
                // Calculate normal for basic shading
                vec2 e = vec2(0.001, 0.0);
                vec3 n = normalize(vec3(
                    map(p + e.xyy) - map(p - e.xyy),
                    map(p + e.yxy) - map(p - e.yxy),
                    map(p + e.yyx) - map(p - e.yyx)
                ));
                
                float diff = max(dot(n, normalize(vec3(1, 2, 3))), 0.0);
                // Color shifts based on entropy
                vec3 baseColor = mix(vec3(0.1, 0.8, 0.4), vec3(0.9, 0.2, 0.1), u_entropy);
                col = baseColor * diff;
                col += pow(1.0 - max(dot(n, -rd), 0.0), 3.0) * baseColor; // Fresnel
            }

            // Add glow based on entropy distance
            col += (u_entropy * 0.2) * vec3(0.5, 0.7, 1.0) / (t * 0.5);

            gl_FragColor = vec4(col, 1.0);
        }
    `;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('webgl');
        if (!context) throw new Error("WebGL not supported");
        this.gl = context;

        this.program = this.createProgram(this.vsSource, this.fsSource);
        this.positionBuffer = this.gl.createBuffer()!;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1,
        ]), this.gl.STATIC_DRAW);

        this.startTime = performance.now();
    }

    private createShader(type: number, source: string): WebGLShader {
        const shader = this.gl.createShader(type)!;
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const info = this.gl.getShaderInfoLog(shader);
            this.gl.deleteShader(shader);
            throw new Error("Shader compilation error: " + info);
        }
        return shader;
    }

    private createProgram(vsSource: string, fsSource: string): WebGLProgram {
        const vs = this.createShader(this.gl.VERTEX_SHADER, vsSource);
        const fs = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);
        const program = this.gl.createProgram()!;
        this.gl.attachShader(program, vs);
        this.gl.attachShader(program, fs);
        this.gl.linkProgram(program);
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            throw new Error("Program linking error");
        }
        return program;
    }

    public updateEntropy(value: number): void {
        this.entropy = Math.max(0.0, Math.min(1.0, value));
    }

    public render(): void {
        const gl = this.gl;
        const time = (performance.now() - this.startTime) / 1000.0;

        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.program);

        const positionLoc = gl.getAttribLocation(this.program, "a_position");
        gl.enableVertexAttribArray(positionLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

        gl.uniform1f(gl.getUniformLocation(this.program, "u_time"), time);
        gl.uniform1f(gl.getUniformLocation(this.program, "u_entropy"), this.entropy);
        gl.uniform2f(gl.getUniformLocation(this.program, "u_resolution"), this.canvas.width, this.canvas.height);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    public resize(width: number, height: number): void {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    public dispose(): void {
        this.gl.deleteBuffer(this.positionBuffer);
        this.gl.deleteProgram(this.program);
    }
}