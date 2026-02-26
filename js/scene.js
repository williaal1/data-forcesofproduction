// =============================================================================
// scene.js — Dark molecular void: no ground, no grid, floating structure
// =============================================================================

import * as THREE from 'three';
import { COLORS, SCENE } from './config.js';

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.NoToneMapping;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.background);
  scene.fog = new THREE.FogExp2(COLORS.fogColor, 0.004);

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    400
  );
  camera.position.set(...SCENE.cameraPosition);
  camera.lookAt(new THREE.Vector3(...SCENE.cameraTarget));

  // Lighting — glossy molecular surfaces
  const ambient = new THREE.AmbientLight(0xffffff, SCENE.ambientIntensity);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, SCENE.directionalIntensity);
  dirLight.position.set(...SCENE.directionalPosition);
  scene.add(dirLight);

  // Hemisphere: cool from above, warm from below
  const hemiLight = new THREE.HemisphereLight(0x8899cc, 0x443322, SCENE.hemisphereIntensity);
  scene.add(hemiLight);

  // No grid, no ground plane — molecular structures float in void

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  return { renderer, scene, camera };
}
