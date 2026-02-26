// =============================================================================
// config.js — Colors, scales, constants
// =============================================================================

// FoP brand colors adapted for dark void background
export const COLORS = {
  void: 0x071520,
  darkTeal: 0x0c425b,
  mediumTeal: 0x105c7e,
  lightTeal: 0xc9e9f8,
  mint: 0x00c0a3,
  coral: 0xfd676a,
  orange: 0xf19953,
  gridColor: 0x0c425b,
  gridCenterColor: 0x105c7e,
  starColor: 0x4a8ea8,
  fogColor: 0x071520,

  // For CSS / troika-three-text (hex strings)
  lightTealHex: '#c9e9f8',
  mintHex: '#00c0a3',
  coralHex: '#fd676a',
  orangeHex: '#f19953',
  mediumTealHex: '#105c7e',
  darkTealHex: '#0c425b',
  textSecondary: '#4a8ea8',
};

// IP growth → color mapping (diverging red-green)
// Coral (#fd676a) → neutral (#4a8ea8) → mint (#00c0a3)
export const IP_COLOR_STOPS = [
  { value: -10, color: [0.99, 0.40, 0.42] },   // coral
  { value: 0,   color: [0.29, 0.56, 0.66] },    // neutral teal
  { value: 10,  color: [0.00, 0.75, 0.64] },     // mint
];

// Scene parameters
export const SCENE = {
  cameraPosition: [0, 25, 65],
  cameraTarget: [0, 12, 0],
  fogNear: 100,
  fogFar: 200,
  bloomStrength: 0.35,
  bloomRadius: 0.3,
  bloomThreshold: 0.6,
  gridSize: 100,
  gridDivisions: 40,
  starCount: 2000,
  starSpread: 120,
  ambientIntensity: 0.15,
  pointLightIntensity: 0.4,
  pointLightPosition: [20, 50, 30],
};

// Sphere parameters
export const SPHERES = {
  minRadius: 0.5,
  maxRadius: 3.5,
  icosaDetail: 2,           // ~80 faces — Battlezone aesthetic
  upstreamnessScale: 7.0,   // Y-axis multiplier
  upstreamnessOffset: 1.0,  // Y-axis base offset
  emissiveIntensity: 0.3,
  wireframeOpacity: 0.95,
};

// Flow parameters
export const FLOWS = {
  minLineWidth: 1.0,
  maxLineWidth: 4.0,
  minOpacity: 0.15,
  maxOpacity: 0.7,
  curveLift: 0.2,          // midpoint lift factor
  dashSize: 0.8,
  gapSize: 0.4,
  animationSpeed: 0.004,
};

// Layout (d3-force-3d)
export const LAYOUT = {
  chargeStrength: -30,
  linkDistance: 8,
  linkStrength: 0.3,
  centerStrength: 0.05,
  warmupTicks: 300,
};

// Trade shell
export const TRADE = {
  hemisphereRadius: 55,
  minCountryRadius: 0.6,
  maxCountryRadius: 2.5,
  connectionOpacity: 0.25,
  icosaDetail: 1,
};

// Labels
export const LABELS = {
  fontSize: 0.55,
  nearDistance: 30,         // full opacity distance
  farDistance: 80,          // zero opacity distance
  outlineWidth: 0.1,
  outlineColor: '#071520',
};

// Animation
export const ANIMATION = {
  startupDuration: 3000,   // ms for full materialization
  startupStagger: 40,      // ms between each sphere
  breathingRate: 0.5,      // oscillations per second
  breathingAmplitude: 0.03,
  cameraTransitionDuration: 1.5, // seconds
};
