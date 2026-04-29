class NoiseEngine {
    constructor(seed = Math.random()) {
        this.p = new Uint8Array(512);
        this.seed = seed;
        this.init();
    }

    init() {
        const permutation = new Uint8Array(256);
        for (let i = 0; i < 256; i++) {
            permutation[i] = i;
        }

        let seedValue = this.seed;
        const mulberry32 = (a) => {
            return function() {
              let t = a += 0x6D2B79F5;
              t = Math.imul(t ^ t >>> 15, t | 1);
              t ^= t + Math.imul(t ^ t >>> 7, t | 61);
              return ((t ^ t >>> 14) >>> 0) / 4294967296;
            }
        };
        const rand = mulberry32(seedValue * 100000);

        for (let i = 255; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
        }

        for (let i = 0; i < 512; i++) {
            this.p[i] = permutation[i & 255];
        }
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(t, a, b) {
        return a + t * (b - a);
    }

    grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    noise(x, y, z = 0) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);

        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);

        const A = this.p[X] + Y, AA = this.p[A] + Z, AB = this.p[A + 1] + Z;
        const B = this.p[X + 1] + Y, BA = this.p[B] + Z, BB = this.p[B + 1] + Z;

        return this.lerp(w, this.lerp(v, this.lerp(u, this.grad(this.p[AA], x, y, z),
            this.grad(this.p[BA], x - 1, y, z)),
            this.lerp(u, this.grad(this.p[AB], x, y - 1, z),
                this.grad(this.p[BB], x - 1, y - 1, z))),
            this.lerp(v, this.lerp(u, this.grad(this.p[AA + 1], x, y, z - 1),
                this.grad(this.p[BA + 1], x - 1, y, z - 1)),
                this.lerp(u, this.grad(this.p[AB + 1], x, y - 1, z - 1),
                    this.grad(this.p[BB + 1], x - 1, y - 1, z - 1))));
    }

    fractal(x, y, octaves = 4, persistence = 0.5, scale = 1.0) {
        let total = 0;
        let frequency = scale;
        let amplitude = 1;
        let maxValue = 0;
        for (let i = 0; i < octaves; i++) {
            total += this.noise(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        return (total / maxValue + 1) / 2;
    }

    hexToCartesian(q, r) {
        const x = 3/2 * q;
        const y = Math.sqrt(3)/2 * q + Math.sqrt(3) * r;
        return { x, y };
    }

    generateMapData(q, r) {
        const { x, y } = this.hexToCartesian(q, r);

        const heightScale = 0.05;
        const moistureScale = 0.03;
        const arcaneScale = 0.08;

        const height = this.fractal(x, y, 6, 0.5, heightScale);
        
        const moisture = this.fractal(x + 500, y + 500, 4, 0.5, moistureScale);
        
        const arcaneRaw = this.fractal(x - 500, y - 500, 3, 0.6, arcaneScale);
        const arcane = Math.pow(arcaneRaw, 2);

        return {
            height: Math.max(0, Math.min(1, height)),
            moisture: Math.max(0, Math.min(1, moisture)),
            arcane: Math.max(0, Math.min(1, arcane))
        };
    }

    getBiome(height, moisture) {
        if (height < 0.2) return 'DEEP_WATER';
        if (height < 0.3) return 'WATER';
        if (height < 0.35) return 'SAND';
        
        if (height > 0.8) {
            if (moisture > 0.5) return 'SNOW';
            return 'MOUNTAIN';
        }
        
        if (moisture < 0.2) return 'DESERT';
        if (moisture < 0.4) return 'GRASSLAND';
        if (moisture < 0.7) return 'FOREST';
        return 'RAINFOREST';
    }
}

export default NoiseEngine;