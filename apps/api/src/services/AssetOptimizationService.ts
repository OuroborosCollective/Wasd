import { Document, WebIO } from '@gltf-transform/core';
import { 
    dedup, 
    prune, 
    quantize, 
    resample, 
    textureCompress, 
    weld, 
    flatten 
} from '@gltf-transform/functions';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';

/**
 * AssetOptimizationService
 * Provides automated mesh quantization and texture compression for GLB models.
 * Utilizes @gltf-transform/core and functions for geometry and texture processing.
 */
export class AssetOptimizationService {
    private io: WebIO;

    constructor() {
        // Initialize WebIO with all standard GLTF extensions (Draco, KTX2, Meshopt, etc.)
        this.io = new WebIO().registerExtensions(ALL_EXTENSIONS);
    }

    /**
     * Performs a full optimization pipeline on a GLB buffer.
     * Includes welding, deduplication, resampling, quantization, and WebP texture compression.
     * 
     * @param buffer The raw GLB file buffer
     * @returns Optimized GLB buffer
     */
    public async optimizeGlb(buffer: Buffer): Promise<Buffer> {
        try {
            // Read binary GLB data into a GLTF-Transform Document
            const document = await this.io.readBinary(new Uint8Array(buffer));

            // Execute transformation pipeline
            await document.transform(
                // 1. Flatten the scene graph to reduce draw calls where possible
                flatten(),
                
                // 2. Merge identical vertices to prepare for quantization
                weld(),
                
                // 3. Remove duplicate accessors and textures
                dedup(),
                
                // 4. Remove unused nodes, meshes, and materials
                prune(),
                
                // 5. Optimize animation keyframes
                resample(),
                
                // 6. Mesh Quantization: Reduces vertex attribute bit depth (e.g. 32-bit to 14-bit)
                // This significantly reduces geometry size with minimal visual loss.
                quantize({
                    quantizePosition: 14,
                    quantizeNormal: 10,
                    quantizeTexcoord: 12,
                    quantizeColor: 8,
                    quantizeWeight: 8,
                }),

                // 7. Texture Compression: Convert textures to WebP and resize if they exceed 2K
                // Uses 'sharp' as the underlying Node.js image processor.
                textureCompress({
                    encoder: sharp,
                    targetFormat: 'webp',
                    resize: [2048, 2048],
                    slots: /^(?!normalTexture).*$/ // Compress everything except normals with lossy webp
                }),

                // Normal map specific compression (keep higher quality for normals)
                textureCompress({
                    encoder: sharp,
                    targetFormat: 'webp',
                    resize: [2048, 2048],
                    slots: /^(normalTexture)$/,
                    quality: 90
                })
            );

            // Write the document back to a binary GLB buffer
            const outputUint8Array = await this.io.writeBinary(document);
            return Buffer.from(outputUint8Array);
        } catch (error) {
            console.error('[AssetOptimizationService] Optimization failed:', error);
            throw new Error(`Failed to optimize GLB asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Minimal optimization focusing only on size reduction for fast previews.
     */
    public async quickCompress(buffer: Buffer): Promise<Buffer> {
        const document = await this.io.readBinary(new Uint8Array(buffer));
        
        await document.transform(
            prune(),
            quantize({ quantizePosition: 12 }),
            textureCompress({
                encoder: sharp,
                targetFormat: 'webp',
                resize: [512, 512],
                quality: 60
            })
        );

        const output = await this.io.writeBinary(document);
        return Buffer.from(output);
    }
}