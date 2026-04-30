import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join, resolve as pathResolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const S3_BUCKET_URL = process.env.SHADOW_RESOLVER_S3_URL || 'https://runtime-cache.internal.s3.amazonaws.com';
const SHADOW_CACHE_DIR = process.env.SHADOW_CACHE_DIR || pathResolve(process.cwd(), '.shadow-cache');

if (!existsSync(SHADOW_CACHE_DIR)) {
    mkdirSync(SHADOW_CACHE_DIR, { recursive: true });
}

/**
 * Downloads a file from S3 if not present locally
 * @param {string} specifier 
 * @returns {Promise<string>} local file path
 */
async function syncFromS3(specifier) {
    const safeName = specifier.replace(/[/\\?%*:|"<>]/g, '-');
    const cachePath = join(SHADOW_CACHE_DIR, safeName);

    if (existsSync(cachePath)) {
        return pathToFileURL(cachePath).href;
    }

    const remoteUrl = `${S3_BUCKET_URL}/${specifier}`;
    
    try {
        const response = await fetch(remoteUrl);
        if (!response.ok) {
            throw new Error(`S3_FETCH_FAILED: ${response.status} ${specifier}`);
        }
        const content = await response.arrayBuffer();
        
        mkdirSync(dirname(cachePath), { recursive: true });
        writeFileSync(cachePath, Buffer.from(content));
        
        return pathToFileURL(cachePath).href;
    } catch (err) {
        throw new Error(`SHADOW_RESOLVER_UNAVAILABLE: ${specifier} - ${err.message}`);
    }
}

/**
 * Node.js Resolver Hook
 */
export async function resolve(specifier, context, nextResolve) {
    const { parentURL = null } = context;

    // Standard resolution attempt
    try {
        return await nextResolve(specifier, context);
    } catch (err) {
        // Only intercept if module is not found locally
        if (err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
            
            // Skip relative paths and absolute paths - only focus on external dependencies
            if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.includes('://')) {
                throw err;
            }

            try {
                // Attempt to resolve via Stateless Virtualization (S3 Cache)
                const virtualizedUrl = await syncFromS3(specifier);
                
                return {
                    shortCircuit: true,
                    url: virtualizedUrl
                };
            } catch (shadowErr) {
                // If S3 fetch also fails, throw the original error
                throw err;
            }
        }
        throw err;
    }
}

/**
 * Node.js Load Hook 
 * Ensures that downloaded files are treated with the correct format
 */
export async function load(url, context, nextLoad) {
    if (url.startsWith(pathToFileURL(SHADOW_CACHE_DIR).href)) {
        // Force interpretation based on extension or default to commonjs/module
        const format = url.endsWith('.mjs') ? 'module' : url.endsWith('.cjs') ? 'commonjs' : 'module';
        return nextLoad(url, { ...context, format });
    }
    return nextLoad(url, context);
}

/**
 * Initialization for Stateless Virtualization environment
 */
export function initialize() {
    process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --no-warnings';
}