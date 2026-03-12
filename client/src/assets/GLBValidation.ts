export interface GLBMeta {
  assetId: string;
  path: string;
  name?: string;
  type?: 'character' | 'building' | 'prop' | 'environment';
  scale?: number;
  version?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates GLB metadata to ensure it has required fields like assetId and path.
 */
export function validateGLBMeta(meta: any): ValidationResult {
  const errors: string[] = [];

  if (!meta) {
    return { isValid: false, errors: ['Metadata is null or undefined'] };
  }

  // Ensure assetId exists and is a string
  if (!meta.assetId) {
    errors.push('Missing required field: assetId');
  } else if (typeof meta.assetId !== 'string' || meta.assetId.trim() === '') {
    errors.push('Field assetId must be a non-empty string');
  }

  // Ensure path exists, is a string, and ends with .glb
  if (!meta.path) {
    errors.push('Missing required field: path');
  } else if (typeof meta.path !== 'string' || meta.path.trim() === '') {
    errors.push('Field path must be a non-empty string');
  } else if (!meta.path.toLowerCase().endsWith('.glb')) {
    errors.push('Field path must point to a .glb file');
  }

  // Optional scale validation
  if (meta.scale !== undefined && (typeof meta.scale !== 'number' || isNaN(meta.scale))) {
    errors.push('Field scale must be a valid number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates an entire registry of assets.
 */
export function validateAssetRegistry(registry: Record<string, any>): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {};
  for (const key in registry) {
    // If assetId is missing in the object, we assume the key is the assetId
    const meta = { ...registry[key], assetId: registry[key].assetId || key };
    results[key] = validateGLBMeta(meta);
  }
  return results;
}
