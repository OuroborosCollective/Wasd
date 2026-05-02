export const getAssetUrl = (directory: string, file: string): string => {
  return new URL(`../assets/${directory}/${file}`, import.meta.url).href;
};

/**
 * Utility to process asset references within strings, commonly used for CSS or dynamic content.
 * Handles explicit typing for regex replacement matches.
 */
export const processAssetReferences = (content: string): string => {
  return content.replace(/url\((['"]?)(.*?)\1\)/g, (match: string, quote: string, suffix: string): string => {
    // If the path is an external URL or data URI, return as is
    if (suffix.startsWith('http') || suffix.startsWith('data:')) {
      return match;
    }

    // Otherwise, normalize or transform the asset path
    return `url(${quote}${suffix}${quote})`;
  });
};

/**
 * Resolves a dynamic asset path with explicit typing
 */
export const resolveDynamicAsset = (directory: string, file: string): string => {
  if (!directory || !file) return '';
  return `/assets/${directory}/${file}`;
};