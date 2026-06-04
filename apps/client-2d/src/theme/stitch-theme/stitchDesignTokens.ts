/**
 * Arelorian Stitch Design Tokens
 * 
 * Theme derived from the Stitch project design system.
 * These tokens define the visual language for the 2D client.
 */

/**
 * Color palette from Stitch design
 * Deep marine background with neon accents
 */
export const stitchColors = {
  // Backgrounds
  'deep-marine': '#101419',
  'void-black': '#070711',
  
  // Primary (blurple/winter blue)
  'primary': '#afc8f0',
  'primary-fixed': '#d4e3ff',
  'primary-container': '#001f3f',
  'on-primary': '#163152',
  'on-primary-container': '#6f88ad',
  
  // Secondary (energy amber)
  'secondary': '#ffb77d',
  'secondary-fixed': '#ffdcc3',
  'secondary-container': '#fd8b00',
  'on-secondary': '#4d2600',
  'on-secondary-container': '#603100',
  
  // Tertiary (malachite green)
  'tertiary': '#2ae500',
  'tertiary-fixed': '#79ff5b',
  'tertiary-container': '#022500',
  'on-tertiary': '#053900',
  'on-tertiary-container': '#1a9c00',
  
  // Mana (cyan)
  'mana-cyan': '#00E5FF',
  
  // Energy
  'energy-amber': '#FF7A00',
  
  // Surfaces
  'surface': '#101419',
  'surface-bright': '#36393f',
  'surface-dim': '#101419',
  'surface-container': '#1c2025',
  'surface-container-low': '#181c21',
  'surface-container-lowest': '#0b0e14',
  'surface-container-high': '#272a30',
  'surface-container-highest': '#31353b',
  
  // Text
  'on-surface': '#e0e2ea',
  'on-surface-variant': '#c4c6cf',
  
  // Outlines
  'outline': '#8e9198',
  'outline-variant': '#43474e',
  
  // Error
  'error': '#ffb4ab',
  'on-error': '#690005',
  'error-container': '#93000a',
  'on-error-container': '#ffdad6',
} as const;

/**
 * Typography scale
 */
export const stitchTypography = {
  'display-lg-mobile': {
    fontFamily: 'Epilogue, sans-serif',
    fontSize: '32px',
    lineHeight: '40px',
    letterSpacing: '-0.02em',
    fontWeight: 700,
  },
  'display-lg': {
    fontFamily: 'Epilogue, sans-serif',
    fontSize: '48px',
    lineHeight: '56px',
    letterSpacing: '-0.02em',
    fontWeight: 700,
  },
  'headline-md': {
    fontFamily: 'Epilogue, sans-serif',
    fontSize: '24px',
    lineHeight: '32px',
    letterSpacing: '0.05em',
    fontWeight: 600,
  },
  'body-md': {
    fontFamily: 'Inter, sans-serif',
    fontSize: '16px',
    lineHeight: '24px',
    fontWeight: 400,
  },
  'body-lg': {
    fontFamily: 'Inter, sans-serif',
    fontSize: '18px',
    lineHeight: '28px',
    fontWeight: 400,
  },
  'label-sm': {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '10px',
    lineHeight: '14px',
    fontWeight: 400,
  },
  'label-caps': {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '12px',
    lineHeight: '16px',
    letterSpacing: '0.15em',
    fontWeight: 500,
  },
} as const;

/**
 * Spacing constants
 */
export const stitchSpacing = {
  'margin-mobile': '20px',
  'margin-tablet': '40px',
  'gutter': '16px',
  'unit': '8px',
  'touch-min': '44px',
} as const;

/**
 * Glassmorphism utility classes
 */
export const stitchGlassmorphism = {
  panel: `
    background-color: rgba(16, 20, 25, 0.4);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: inset 0 0 20px rgba(175, 200, 240, 0.05);
  `,
  refraction: `
    &::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%);
      pointer-events: none;
      border-radius: inherit;
    }
  `,
} as const;

/**
 * Animation keyframes
 */
export const stitchAnimations = {
  scanLine: `
    @keyframes scan {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(200%); }
    }
  `,
  fadeIn: `
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `,
  pulse: `
    @keyframes pulse {
      0%, 100% { opacity: 1.0; }
      50% { opacity: 0.5; }
    }
  `,
} as const;

/**
 * Hex button shape
 */
export const stitchShapes = {
  hexagonBtn: 'clip-path: polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%);',
} as const;

/**
 * Combined CSS for Stitch theme
 */
export const stitchThemeCSS = `
/* Arelorian Stitch Theme */
:root {
  --stitch-primary: ${stitchColors.primary};
  --stitch-secondary: ${stitchColors.secondary};
  --stitch-tertiary: ${stitchColors.tertiary};
  --stitch-mana: ${stitchColors['mana-cyan']};
  --stitch-energy: ${stitchColors['energy-amber']};
  --stitch-background: ${stitchColors['deep-marine']};
  --stitch-surface: ${stitchColors.surface};
  --stitch-on-surface: ${stitchColors['on-surface']};
}

/* Glass panel utility */
.glass-panel {
  ${stitchGlassmorphism.panel}
}
`;

/**
 * Type for color names
 */
export type StitchColorKey = keyof typeof stitchColors;
export type StitchTypographyKey = keyof typeof stitchTypography;