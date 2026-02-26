// =============================================================================
// interaction.js — Raycasting, selection, camera fly-to
// =============================================================================

import * as THREE from 'three';
import { SCENE, ANIMATION } from './config.js';

export function setupInteraction(camera, sphereMeshes, controls, callbacks) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hoveredMesh = null;
  let selectedMesh = null;

  const canvas = document.querySelector('#canvas-container canvas');
  if (!canvas) return { getSelected: () => null };

  // Mouse move: hover highlight
  canvas.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(sphereMeshes);

    // Reset previous hover
    if (hoveredMesh && hoveredMesh !== selectedMesh) {
      hoveredMesh.material.uniforms.uSelected.value = 0.0;
      canvas.style.cursor = 'default';
    }

    if (intersects.length > 0) {
      hoveredMesh = intersects[0].object;
      if (hoveredMesh !== selectedMesh) {
        hoveredMesh.material.uniforms.uSelected.value = 0.3;
      }
      canvas.style.cursor = 'pointer';
    } else {
      hoveredMesh = null;
    }
  });

  // Click: select
  canvas.addEventListener('click', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(sphereMeshes);

    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      selectSector(mesh);
    }
  });

  function selectSector(mesh) {
    // Deselect previous
    if (selectedMesh) {
      selectedMesh.material.uniforms.uSelected.value = 0.0;
    }

    selectedMesh = mesh;
    mesh.material.uniforms.uSelected.value = 1.0;

    // Camera fly-to
    const target = mesh.position.clone();
    const offset = new THREE.Vector3(8, 4, 12);
    const newPos = target.clone().add(offset);

    if (controls && controls.setLookAt) {
      controls.setLookAt(
        newPos.x, newPos.y, newPos.z,
        target.x, target.y, target.z,
        true // enable transition
      );
    } else {
      camera.position.copy(newPos);
      camera.lookAt(target);
    }

    if (callbacks.onSelect) {
      callbacks.onSelect(mesh.userData.sectorCode, mesh.userData.sectorData);
    }
  }

  // Select by code (for info panel navigation)
  function selectByCode(code) {
    const mesh = sphereMeshes.find(m => m.userData.sectorCode === code);
    if (mesh) selectSector(mesh);
  }

  // Escape: return to overview
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (selectedMesh) {
        selectedMesh.material.uniforms.uSelected.value = 0.0;
        selectedMesh = null;
      }

      // Return to overview position
      if (controls && controls.setLookAt) {
        controls.setLookAt(
          ...SCENE.cameraPosition,
          ...SCENE.cameraTarget,
          true
        );
      }

      if (callbacks.onDeselect) {
        callbacks.onDeselect();
      }
    }
  });

  return {
    getSelected: () => selectedMesh,
    selectByCode,
  };
}
