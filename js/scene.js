// =============================================================================
// scene.js — Three.js scene, camera, bloom, grid floor, starfield
// =============================================================================

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { COLORS, SCENE } from './config.js';

export function createScene(container) {
  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.void);
  scene.fog = new THREE.Fog(COLORS.fogColor, SCENE.fogNear, SCENE.fogFar);

  // Camera
  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    300
  );
  camera.position.set(...SCENE.cameraPosition);
  camera.lookAt(new THREE.Vector3(...SCENE.cameraTarget));

  // Bloom post-processing
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    SCENE.bloomStrength,
    SCENE.bloomRadius,
    SCENE.bloomThreshold
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, SCENE.ambientIntensity);
  scene.add(ambient);

  const pointLight = new THREE.PointLight(COLORS.lightTeal, SCENE.pointLightIntensity, 150);
  pointLight.position.set(...SCENE.pointLightPosition);
  scene.add(pointLight);

  // Grid floor (Battlezone ground = final demand surface at Y=0)
  const grid = new THREE.GridHelper(
    SCENE.gridSize,
    SCENE.gridDivisions,
    COLORS.gridCenterColor,
    COLORS.gridColor
  );
  grid.material.opacity = 0.25;
  grid.material.transparent = true;
  scene.add(grid);

  // Starfield
  const starGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(SCENE.starCount * 3);
  for (let i = 0; i < SCENE.starCount; i++) {
    starPositions[i * 3] = (Math.random() - 0.5) * SCENE.starSpread * 2;
    starPositions[i * 3 + 1] = Math.random() * SCENE.starSpread;
    starPositions[i * 3 + 2] = (Math.random() - 0.5) * SCENE.starSpread * 2;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({
    color: COLORS.starColor,
    size: 0.15,
    transparent: true,
    opacity: 0.4,
    sizeAttenuation: true,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // Resize handler
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloomPass.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  return { renderer, scene, camera, composer, bloomPass };
}
