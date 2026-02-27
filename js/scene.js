// =============================================================================
// scene.js — Three.js scene: GPC light theme, clean institutional look
// =============================================================================

import * as THREE from 'three';
import { COLORS, SCENE } from './config.js';

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.background);
  scene.fog = new THREE.FogExp2(COLORS.fogColor, 0.006);

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    400
  );
  camera.position.set(...SCENE.cameraPosition);
  camera.lookAt(new THREE.Vector3(...SCENE.cameraTarget));

  // Lighting — clean, even, for solid materials
  const ambient = new THREE.AmbientLight(0xffffff, SCENE.ambientIntensity);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, SCENE.directionalIntensity);
  dirLight.position.set(...SCENE.directionalPosition);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 100;
  dirLight.shadow.camera.left = -50;
  dirLight.shadow.camera.right = 50;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  scene.add(dirLight);

  // Hemisphere light: warm from below, cool from above
  const hemiLight = new THREE.HemisphereLight(0xddeeff, 0xf5f0e0, SCENE.hemisphereIntensity);
  scene.add(hemiLight);

  // Grid floor at Y=0
  const grid = new THREE.GridHelper(
    SCENE.gridSize,
    SCENE.gridDivisions,
    COLORS.gridCenterColor,
    COLORS.gridColor
  );
  grid.name = 'grid';
  grid.material.opacity = 0.3;
  grid.material.transparent = true;
  scene.add(grid);

  // Subtle ground plane for depth perception
  const groundGeo = new THREE.PlaneGeometry(200, 200);
  const groundMat = new THREE.MeshStandardMaterial({
    color: COLORS.background,
    roughness: 1.0,
    metalness: 0.0,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.1;
  ground.name = 'ground';
  ground.receiveShadow = true;
  scene.add(ground);

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
