// =============================================================================
// interaction.js — Raycasting, selection, camera fly-to
// =============================================================================

import * as THREE from 'three';
import { SCENE } from './config.js';

export function setupInteraction(camera, sphereMeshes, controls, callbacks) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hoveredMesh = null;
  let selectedMesh = null;

  const canvas = document.querySelector('#canvas-container canvas');
  if (!canvas) return { getSelected: () => null, selectByCode: () => {} };

  function setHighlight(mesh, intensity) {
    if (!mesh) return;
    mesh.material.emissive = mesh.material.emissive || new THREE.Color(0x000000);
    mesh.material.emissiveIntensity = intensity;
    if (intensity > 0) {
      mesh.material.emissive.set(0xffffff);
    }
  }

  canvas.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(sphereMeshes);

    if (hoveredMesh && hoveredMesh !== selectedMesh) {
      setHighlight(hoveredMesh, 0);
      canvas.style.cursor = 'default';
    }

    if (intersects.length > 0) {
      hoveredMesh = intersects[0].object;
      if (hoveredMesh !== selectedMesh) {
        setHighlight(hoveredMesh, 0.15);
      }
      canvas.style.cursor = 'pointer';
    } else {
      hoveredMesh = null;
    }
  });

  canvas.addEventListener('click', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(sphereMeshes);

    if (intersects.length > 0) {
      selectSector(intersects[0].object);
    }
  });

  function selectSector(mesh) {
    if (selectedMesh) {
      setHighlight(selectedMesh, 0);
      selectedMesh.material.opacity = 0.92;
    }

    selectedMesh = mesh;
    setHighlight(mesh, 0.3);
    mesh.material.opacity = 1.0;

    const target = mesh.position.clone();
    const offset = new THREE.Vector3(6, 3, 10);
    const newPos = target.clone().add(offset);

    if (controls && controls.setLookAt) {
      controls.setLookAt(newPos.x, newPos.y, newPos.z, target.x, target.y, target.z, true);
    } else {
      camera.position.copy(newPos);
      camera.lookAt(target);
    }

    if (callbacks.onSelect) {
      callbacks.onSelect(mesh.userData.sectorCode, mesh.userData.sectorData);
    }
  }

  function selectByCode(code) {
    const mesh = sphereMeshes.find(m => m.userData.sectorCode === code);
    if (mesh) selectSector(mesh);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (selectedMesh) {
        setHighlight(selectedMesh, 0);
        selectedMesh.material.opacity = 0.92;
        selectedMesh = null;
      }

      if (controls && controls.setLookAt) {
        controls.setLookAt(...SCENE.cameraPosition, ...SCENE.cameraTarget, true);
      }

      if (callbacks.onDeselect) callbacks.onDeselect();
    }
  });

  return { getSelected: () => selectedMesh, selectByCode };
}
