// =============================================================================
// config.js — Colors, scales, constants
// Molecular dark theme: floating structure, glossy nodes, visible bonds
// =============================================================================

// Dark molecular palette
export const COLORS = {
  background: 0x0a0a1a,       // deep void
  gridColor: 0x222233,
  gridCenterColor: 0x333344,
  fogColor: 0x0a0a1a,

  // Node colors
  mint: 0x00c0a3,             // growing / green
  orange: 0xf19953,           // services / warm
  coral: 0xfd676a,            // declining / red
  charcoal: 0x555566,         // neutral on dark bg
  darkTeal: 0x1a8caa,         // brighter for dark bg
  mediumTeal: 0x2ab0d4,
  lightTeal: 0xc9e9f8,

  // Flow bonds
  flowColor: 0x6677aa,        // steel blue bonds
  flowHighlight: 0x00c0a3,    // highlighted connections

  // Trade shell
  tradeColor: 0xf19953,

  // Hex strings for CSS / troika
  backgroundHex: '#0a0a1a',
  charcoalHex: '#aaaabb',
  mintHex: '#00c0a3',
  coralHex: '#fd676a',
  orangeHex: '#f19953',
  darkTealHex: '#1a8caa',
  mediumGrayHex: '#888899',
};

// IP growth → color mapping (diverging) — brighter for dark bg
// Coral → neutral → mint
export const IP_COLOR_STOPS = [
  { value: -10, color: [0.99, 0.40, 0.42] },   // coral
  { value: 0,   color: [0.45, 0.45, 0.55] },    // muted blue-gray
  { value: 10,  color: [0.00, 0.75, 0.64] },    // mint
];

// Sectors without IP data get colored by type — brighter for dark bg
export const SECTOR_TYPE_COLORS = {
  manufacturing: 0x1a8caa,    // bright teal
  services: 0xf19953,         // orange
  government: 0x888899,       // light gray
  resources: 0x8fa832,        // bright olive
};

// Scene parameters
export const SCENE = {
  cameraPosition: [35, 20, 35],
  cameraTarget: [0, 0, 0],
  fogNear: 80,
  fogFar: 200,
  bloomStrength: 0.0,
  bloomRadius: 0,
  bloomThreshold: 1.0,
  gridSize: 100,
  gridDivisions: 30,
  ambientIntensity: 0.5,
  directionalIntensity: 0.8,
  directionalPosition: [20, 30, 15],
  hemisphereIntensity: 0.25,
};

// Sphere parameters
export const SPHERES = {
  minRadius: 0.4,
  maxRadius: 1.4,
  geometryDetail: 32,
  upstreamnessScale: 1.5,     // compressed for near-spherical structure
  upstreamnessOffset: 0.0,    // centered around origin
  metalness: 0.25,            // glossy molecular look
  roughness: 0.4,
};

// Flow parameters — visible bonds
export const FLOWS = {
  minTubeRadius: 0.015,
  maxTubeRadius: 0.09,
  minOpacity: 0.1,            // dimmer weak bonds to reduce center noise
  maxOpacity: 0.55,
  curveLift: 0.05,
};

// Layout — compact molecular structure
export const LAYOUT = {
  chargeStrength: -40,        // weaker repulsion (was -60, blew out outliers)
  linkDistance: 4,
  linkStrength: 0.5,
  centerStrength: 0.8,        // very strong centering — tight geodesic
  warmupTicks: 800,
  yForceStrength: 0.02,
};

// Trade shell
export const TRADE = {
  hemisphereRadius: 40,
  minCountryRadius: 0.4,
  maxCountryRadius: 1.5,
  connectionOpacity: 0.12,
};

// Labels
export const LABELS = {
  fontSize: 0.5,
  nearDistance: 25,
  farDistance: 55,
  outlineWidth: 0.08,
  outlineColor: '#0a0a1a',
  color: '#ddddef',           // brighter labels
};

// Animation
export const ANIMATION = {
  startupDuration: 3000,
  startupStagger: 40,
  breathingRate: 0.5,
  breathingAmplitude: 0.02,
  cameraTransitionDuration: 1.5,
};
