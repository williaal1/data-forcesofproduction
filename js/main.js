// =============================================================================
// main.js — App init, render loop, startup animation
// =============================================================================

import * as THREE from 'three';
import { SCENE, ANIMATION } from './config.js';
import { loadData } from './data-loader.js';
import { createScene } from './scene.js';
import { createSpheres } from './spheres.js';
import { applyLayout } from './layout.js';
import { createFlows } from './flows.js';
import { createLabels } from './labels.js';
import { setupInteraction } from './interaction.js';
import { setupHUD } from './hud.js';
import { createMinimap } from './minimap.js';
import { applyTheme, THEMES } from './theme.js';
import { createFocusLayout } from './focus-layout.js';

const loadingFill = document.getElementById('loading-fill');
const loadingScreen = document.getElementById('loading-screen');
const loadingText = document.getElementById('loading-text');

function setLoadingProgress(pct, text) {
  loadingFill.style.width = `${pct * 100}%`;
  if (text) loadingText.textContent = text;
}

async function main() {
  try {
    setLoadingProgress(0, 'LOADING PRODUCTION MATRIX');
    const data = await loadData((p) => setLoadingProgress(p * 0.3));

    setLoadingProgress(0.3, 'INITIALIZING RENDERER');
    const container = document.getElementById('canvas-container');
    const { renderer, scene, camera } = createScene(container);

    // Camera controls
    setLoadingProgress(0.35, 'CONFIGURING CONTROLS');
    let controls;
    try {
      const CameraControls = (await import('https://cdn.jsdelivr.net/npm/camera-controls@2.9.0/dist/camera-controls.module.js')).default;
      CameraControls.install({ THREE });
      controls = new CameraControls(camera, renderer.domElement);
      controls.setLookAt(...SCENE.cameraPosition, ...SCENE.cameraTarget);
      controls.dampingFactor = 0.1;
      controls.draggingDampingFactor = 0.2;
      controls.dollyToCursor = true;
      controls.minDistance = 5;
      controls.maxDistance = 150;
    } catch (e) {
      console.warn('camera-controls unavailable, using OrbitControls');
      const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(...SCENE.cameraTarget);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.update();
    }

    setLoadingProgress(0.4, 'GENERATING SECTOR GEOMETRY');
    const sphereSystem = createSpheres(scene, data.sectors);

    setLoadingProgress(0.5, 'COMPUTING FORCE LAYOUT');
    await applyLayout(sphereSystem.meshes, data.sectors, data.flows);

    setLoadingProgress(0.65, 'TRACING INTER-INDUSTRY FLOWS');
    const flowSystem = createFlows(scene, data.flows, sphereSystem.meshes);
    flowSystem.rebuild();

    setLoadingProgress(0.75, 'RENDERING LABELS');
    const labelSystem = await createLabels(scene, sphereSystem.meshes, data.sectors);

    // HUD + Interaction
    setLoadingProgress(0.9, 'INITIALIZING HUD');
    let selectByCodeRef = () => {};
    const hud = setupHUD(data.flows, (code) => selectByCodeRef(code));
    hud.setSectorLookup(data.sectors);

    const focusLayout = createFocusLayout(sphereSystem, flowSystem);

    const interaction = setupInteraction(camera, sphereSystem.meshes, controls, {
      onSelect(code, sectorData) {
        hud.showPanel(code, sectorData);
        focusLayout.focusOnSector(code, data.flows);
      },
      onDeselect() {
        hud.hidePanel();
        focusLayout.reset();
      },
    });
    selectByCodeRef = interaction.selectByCode;

    // Minimap
    const minimap = createMinimap(camera, sphereSystem.meshes, data.sectors);

    // Theme toggle
    const themeRefs = { scene, sphereSystem, flowSystem, labelSystem };
    const savedTheme = localStorage.getItem('fop-theme') || 'light';
    applyTheme(savedTheme, themeRefs);

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const current = localStorage.getItem('fop-theme') || 'light';
      const next = current === 'light' ? 'dark' : 'light';
      applyTheme(next, themeRefs);
    });

    // Startup
    setLoadingProgress(1.0, 'READY');
    await new Promise(r => setTimeout(r, 300));
    loadingScreen.classList.add('fade-out');
    setTimeout(() => loadingScreen.style.display = 'none', 800);

    // Materialization: bottom-up
    const sortedByY = [...sphereSystem.meshes].sort(
      (a, b) => a.userData.targetY - b.userData.targetY
    );
    for (let i = 0; i < sortedByY.length; i++) {
      const mesh = sortedByY[i];
      setTimeout(() => animateScale(mesh, 0, 1, 600), i * ANIMATION.startupStagger);
    }

    // Render loop — direct rendering, no bloom
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      if (controls.update) controls.update(delta);

      focusLayout.update(delta);
      sphereSystem.update(elapsed);
      flowSystem.update(elapsed);
      if (labelSystem) labelSystem.update(camera);
      minimap.update();

      renderer.render(scene, camera);
    }

    animate();
    console.log('IO Economy Visualization initialized');

    // Expose references for screenshot pipeline
    window.__viz = { camera, controls, scene, renderer, sphereSystem, flowSystem, focusLayout, applyTheme: (name) => applyTheme(name, themeRefs) };

  } catch (err) {
    console.error('Initialization failed:', err);
    loadingText.textContent = `ERROR: ${err.message}`;
    loadingFill.style.background = '#fd676a';
  }
}

function animateScale(mesh, from, to, duration) {
  const startTime = performance.now();
  const baseRadius = mesh.userData.baseRadius || 1;

  function step() {
    const t = Math.min((performance.now() - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const s = (from + (to - from) * eased) * baseRadius;
    mesh.scale.set(s, s, s);
    if (t < 1) requestAnimationFrame(step);
  }
  step();
}

main();
