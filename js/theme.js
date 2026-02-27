// =============================================================================
// theme.js — Light/dark mode toggle for IO Economy Visualization
// =============================================================================

import * as THREE from 'three';

export const THEMES = {
  light: {
    name: 'light',
    scene: {
      background: 0xf5f5f0,
      fogColor: 0xf5f5f0,
      fogDensity: 0.006,
    },
    grid: { visible: true },
    ground: { visible: true, color: 0xf5f5f0 },
    lights: {
      ambientIntensity: 0.7,
      directionalIntensity: 0.6,
      hemisphereIntensity: 0.3,
      hemiSkyColor: 0xddeeff,
      hemiGroundColor: 0xf5f0e0,
    },
    flows: {
      color: 0x333333,
    },
    spheres: {
      metalness: 0.05,
      roughness: 0.7,
    },
    labels: {
      color: '#333333',
      outlineColor: '#f5f5f0',
    },
    css: {
      '--bg': '#f5f5f0',
      '--bg-panel': 'rgba(255, 255, 255, 0.92)',
      '--border': 'rgba(0, 0, 0, 0.1)',
      '--text-primary': '#333333',
      '--text-secondary': '#777777',
      '--text-dim': 'rgba(0, 0, 0, 0.35)',
    },
    minimap: {
      background: '#ffffff',
      border: 'rgba(0,0,0,0.1)',
      tierLine: 'rgba(0,0,0,0.06)',
      tierLabel: 'rgba(0,0,0,0.25)',
      noDataDot: (inView) => `rgba(100, 100, 100, ${inView ? 0.7 : 0.3})`,
      positiveDot: (inView) => `rgba(0, 192, 163, ${inView ? 0.9 : 0.35})`,
      negativeDot: (inView) => `rgba(253, 103, 106, ${inView ? 0.9 : 0.35})`,
      selectionStroke: '#333333',
      cameraFill: 'rgba(12, 66, 91, 0.7)',
      cameraStroke: '#0c425b',
      fovFill: 'rgba(12, 66, 91, 0.05)',
      fovStroke: 'rgba(12, 66, 91, 0.15)',
      yAxisLabel: 'rgba(0,0,0,0.3)',
    },
    icon: 'moon', // show moon icon → clicking switches to dark
  },

  dark: {
    name: 'dark',
    scene: {
      background: 0x0a0a1a,
      fogColor: 0x0a0a1a,
      fogDensity: 0.004,
    },
    grid: { visible: false },
    ground: { visible: false, color: 0x0a0a1a },
    lights: {
      ambientIntensity: 0.5,
      directionalIntensity: 0.5,
      hemisphereIntensity: 0.25,
      hemiSkyColor: 0x8899cc,
      hemiGroundColor: 0x221122,
    },
    flows: {
      color: 0x6677aa,
    },
    spheres: {
      metalness: 0.25,
      roughness: 0.4,
    },
    labels: {
      color: '#ddddef',
      outlineColor: '#0a0a1a',
    },
    css: {
      '--bg': '#0a0a1a',
      '--bg-panel': 'rgba(15, 15, 30, 0.92)',
      '--border': 'rgba(255, 255, 255, 0.1)',
      '--text-primary': '#ddddef',
      '--text-secondary': '#8888aa',
      '--text-dim': 'rgba(255, 255, 255, 0.3)',
    },
    minimap: {
      background: '#0f0f1e',
      border: 'rgba(255,255,255,0.1)',
      tierLine: 'rgba(255,255,255,0.06)',
      tierLabel: 'rgba(255,255,255,0.25)',
      noDataDot: (inView) => `rgba(140, 140, 160, ${inView ? 0.7 : 0.3})`,
      positiveDot: (inView) => `rgba(0, 192, 163, ${inView ? 0.9 : 0.35})`,
      negativeDot: (inView) => `rgba(253, 103, 106, ${inView ? 0.9 : 0.35})`,
      selectionStroke: '#ddddef',
      cameraFill: 'rgba(136, 153, 204, 0.7)',
      cameraStroke: '#8899cc',
      fovFill: 'rgba(136, 153, 204, 0.05)',
      fovStroke: 'rgba(136, 153, 204, 0.15)',
      yAxisLabel: 'rgba(255,255,255,0.3)',
    },
    icon: 'sun', // show sun icon → clicking switches to light
  },
};

/**
 * Apply a theme to all visualization systems in place.
 * @param {'light'|'dark'} name - Theme name
 * @param {Object} refs - { scene, sphereSystem, flowSystem, labelSystem }
 */
export function applyTheme(name, refs) {
  const theme = THEMES[name];
  if (!theme) return;

  const { scene, sphereSystem, flowSystem, labelSystem } = refs;

  // 1. Scene background, fog
  scene.background = new THREE.Color(theme.scene.background);
  if (scene.fog) {
    scene.fog.color.set(theme.scene.fogColor);
    scene.fog.density = theme.scene.fogDensity;
  }

  // 2. Grid + ground visibility (identified by name set in scene.js)
  for (const child of scene.children) {
    if (child.name === 'grid') {
      child.visible = theme.grid.visible;
    }
    if (child.name === 'ground') {
      child.visible = theme.ground.visible;
      if (child.material) {
        child.material.color.set(theme.ground.color);
      }
    }
  }

  // 3. Lights
  for (const child of scene.children) {
    if (child.isAmbientLight) {
      child.intensity = theme.lights.ambientIntensity;
    }
    if (child.isDirectionalLight) {
      child.intensity = theme.lights.directionalIntensity;
    }
    if (child.isHemisphereLight) {
      child.intensity = theme.lights.hemisphereIntensity;
      child.color.set(theme.lights.hemiSkyColor);
      child.groundColor.set(theme.lights.hemiGroundColor);
    }
  }

  // 4. Flow tube colors (non-highlighted only)
  if (flowSystem?.lines) {
    for (const tube of flowSystem.lines) {
      // Only update base color if not currently highlighted
      tube.userData._themeFlowColor = theme.flows.color;
      // If opacity matches base, it's not highlighted — update color
      if (Math.abs(tube.material.opacity - tube.userData.baseOpacity) < 0.01) {
        tube.material.color.set(theme.flows.color);
      }
    }
  }

  // 5. Sphere materials
  if (sphereSystem?.meshes) {
    for (const mesh of sphereSystem.meshes) {
      mesh.material.metalness = theme.spheres.metalness;
      mesh.material.roughness = theme.spheres.roughness;
    }
  }

  // 6. Troika labels
  if (labelSystem?.labels) {
    for (const label of labelSystem.labels) {
      if (label.color !== undefined) {
        label.color = theme.labels.color;
      }
      if (label.outlineColor !== undefined) {
        label.outlineColor = theme.labels.outlineColor;
      }
      if (label.sync) label.sync();
    }
  }

  // 7. CSS custom properties
  const root = document.documentElement.style;
  for (const [prop, val] of Object.entries(theme.css)) {
    root.setProperty(prop, val);
  }

  // 8. Store on window for minimap
  window.__currentTheme = theme;

  // 9. Persist preference
  localStorage.setItem('fop-theme', name);

  // 10. Toggle button icon
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.setAttribute('data-theme', name);
    btn.title = name === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
  }
}
