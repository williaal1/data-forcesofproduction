// =============================================================================
// config.js — Colors, scales, constants
// GPC aesthetic: light theme, solid spheres, dark connecting lines
// =============================================================================

// GPC / Common Wealth brand palette
export const COLORS = {
  background: 0xf5f5f0,       // warm cream
  gridColor: 0xd8d8d0,
  gridCenterColor: 0xbbbbb0,
  fogColor: 0xf5f5f0,

  // Node colors (GPC style)
  mint: 0x00c0a3,             // growing / green
  orange: 0xf19953,           // services / warm
  coral: 0xfd676a,            // declining / red
  charcoal: 0x333333,         // dark nodes / neutral
  darkTeal: 0x0c425b,
  mediumTeal: 0x105c7e,
  lightTeal: 0xc9e9f8,

  // Flow lines
  flowColor: 0x333333,        // charcoal connections
  flowHighlight: 0x00c0a3,    // highlighted connections

  // Trade shell
  tradeColor: 0xf19953,

  // Hex strings for CSS / troika
  backgroundHex: '#f5f5f0',
  charcoalHex: '#333333',
  mintHex: '#00c0a3',
  coralHex: '#fd676a',
  orangeHex: '#f19953',
  darkTealHex: '#0c425b',
  mediumGrayHex: '#777777',
};

// IP growth → color mapping (diverging)
// Coral (#fd676a) → charcoal (#555) → mint (#00c0a3)
export const IP_COLOR_STOPS = [
  { value: -10, color: [0.99, 0.40, 0.42] },   // coral
  { value: 0,   color: [0.33, 0.33, 0.33] },    // charcoal neutral
  { value: 10,  color: [0.00, 0.75, 0.64] },     // mint
];

// Sectors without IP data get colored by type
export const SECTOR_TYPE_COLORS = {
  manufacturing: 0x0c425b,    // dark teal
  services: 0xf19953,         // orange
  government: 0x777777,       // gray
  resources: 0x6f7c12,        // olive (GPC green)
};

// Scene parameters
export const SCENE = {
  cameraPosition: [0, 22, 55],
  cameraTarget: [0, 14, 0],
  fogNear: 120,
  fogFar: 250,
  bloomStrength: 0.0,         // no bloom for clean look
  bloomRadius: 0,
  bloomThreshold: 1.0,
  gridSize: 100,
  gridDivisions: 30,
  ambientIntensity: 0.7,
  directionalIntensity: 0.6,
  directionalPosition: [15, 40, 25],
  hemisphereIntensity: 0.3,
};

// Sphere parameters
export const SPHERES = {
  minRadius: 0.8,
  maxRadius: 4.5,
  geometryDetail: 32,         // SphereGeometry segments — smooth solid
  upstreamnessScale: 6.0,
  upstreamnessOffset: 1.0,
  metalness: 0.05,
  roughness: 0.7,
};

// Flow parameters
export const FLOWS = {
  minLineWidth: 1.5,
  maxLineWidth: 6.0,
  minOpacity: 0.25,
  maxOpacity: 0.8,
  curveLift: 0.25,
  dashSize: 0.8,
  gapSize: 0.5,
  animationSpeed: 0.003,
};

// Layout (d3-force-3d)
export const LAYOUT = {
  chargeStrength: -25,
  linkDistance: 8,
  linkStrength: 0.3,
  centerStrength: 0.05,
  warmupTicks: 300,
};

// Trade shell
export const TRADE = {
  hemisphereRadius: 50,
  minCountryRadius: 0.5,
  maxCountryRadius: 2.0,
  connectionOpacity: 0.15,
};

// Labels
export const LABELS = {
  fontSize: 0.5,
  nearDistance: 25,
  farDistance: 70,
  outlineWidth: 0.06,
  outlineColor: '#f5f5f0',
  color: '#333333',
};

// Animation
export const ANIMATION = {
  startupDuration: 3000,
  startupStagger: 40,
  breathingRate: 0.5,
  breathingAmplitude: 0.02,
  cameraTransitionDuration: 1.5,
};
