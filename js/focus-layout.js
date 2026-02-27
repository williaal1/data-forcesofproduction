// =============================================================================
// focus-layout.js — Supply chain focus layout on sector selection
// Animates spheres into vertical upstream/downstream arrangement
// =============================================================================

import * as THREE from 'three';

const LERP_FACTOR = 0.08;
const SETTLE_THRESHOLD = 0.05;
const SUPPLIER_Y_OFFSET = 5;
const CUSTOMER_Y_OFFSET = -5;
const ARC_RADIUS = 8;
const MAX_CONNECTED = 8;
const UNCONNECTED_PUSH = 2.5;
const DIM_OPACITY = 0.15;
const NORMAL_OPACITY = 0.92;

export function createFocusLayout(sphereSystem, flowSystem) {
  const savedPositions = new Map();
  const targetPositions = new Map();
  const targetOpacities = new Map();
  let isAnimating = false;
  let isFocused = false;
  let focusedCode = null;

  function saveCurrentPositions() {
    for (const mesh of sphereSystem.meshes) {
      const code = mesh.userData.sectorCode;
      savedPositions.set(code, mesh.position.clone());
    }
  }

  function arrangeArc(codes, centerX, centerY, centerZ, radius) {
    const positions = new Map();
    const count = codes.length;
    if (count === 0) return positions;

    if (count === 1) {
      positions.set(codes[0], new THREE.Vector3(centerX, centerY, centerZ));
      return positions;
    }

    // Spread evenly across an arc — biggest (index 0) at center
    const maxAngle = Math.PI * 0.6; // 108 degree arc
    for (let i = 0; i < count; i++) {
      // Alternate left/right from center for balanced look
      let slot;
      if (i === 0) {
        slot = 0;
      } else if (i % 2 === 1) {
        slot = Math.ceil(i / 2);
      } else {
        slot = -Math.ceil(i / 2);
      }

      const angle = (slot / Math.max(Math.ceil(count / 2), 1)) * (maxAngle / 2);
      const x = centerX + Math.sin(angle) * radius;
      const z = centerZ + Math.cos(angle) * radius;
      positions.set(codes[i], new THREE.Vector3(x, centerY, z));
    }
    return positions;
  }

  function focusOnSector(code, flowsData) {
    focusedCode = code;

    // Save positions on first focus
    if (!isFocused) {
      saveCurrentPositions();
    }
    isFocused = true;

    // Find the selected mesh
    const selectedMesh = sphereSystem.meshes.find(
      m => m.userData.sectorCode === code
    );
    if (!selectedMesh) return;

    // Compute connected sectors
    // Suppliers: flows where target === code (they sell inputs TO selected)
    const supplierFlows = flowsData
      .filter(f => f.target === code && f.source !== code)
      .sort((a, b) => b.value - a.value)
      .slice(0, MAX_CONNECTED);

    // Customers: flows where source === code (selected sells TO them)
    const customerFlows = flowsData
      .filter(f => f.source === code && f.target !== code)
      .sort((a, b) => b.value - a.value)
      .slice(0, MAX_CONNECTED);

    const supplierCodes = supplierFlows.map(f => f.source);
    const customerCodes = customerFlows.map(f => f.target);
    const connectedSet = new Set([code, ...supplierCodes, ...customerCodes]);

    // Compute target positions
    targetPositions.clear();
    targetOpacities.clear();

    const selectedY = selectedMesh.position.y;

    // Selected sphere → centered
    targetPositions.set(code, new THREE.Vector3(0, selectedY, 0));
    targetOpacities.set(code, 1.0);

    // Suppliers arc above
    const supplierPositions = arrangeArc(
      supplierCodes, 0, selectedY + SUPPLIER_Y_OFFSET, 0, ARC_RADIUS
    );
    for (const [c, pos] of supplierPositions) {
      targetPositions.set(c, pos);
      targetOpacities.set(c, NORMAL_OPACITY);
    }

    // Customers arc below
    const customerPositions = arrangeArc(
      customerCodes, 0, selectedY + CUSTOMER_Y_OFFSET, 0, ARC_RADIUS
    );
    for (const [c, pos] of customerPositions) {
      targetPositions.set(c, pos);
      targetOpacities.set(c, NORMAL_OPACITY);
    }

    // Unconnected spheres → push outward, dim
    for (const mesh of sphereSystem.meshes) {
      const c = mesh.userData.sectorCode;
      if (connectedSet.has(c)) continue;

      const cur = mesh.position.clone();
      const xz = new THREE.Vector2(cur.x, cur.z);
      if (xz.length() < 0.5) {
        // If near center, push in an arbitrary direction
        xz.set(1, 0).rotateAround(new THREE.Vector2(0, 0), Math.random() * Math.PI * 2);
      }
      xz.normalize().multiplyScalar(
        Math.max(xz.length(), 1) * UNCONNECTED_PUSH
      );

      // Use saved position for the push direction if available
      const saved = savedPositions.get(c);
      if (saved) {
        const sxz = new THREE.Vector2(saved.x, saved.z);
        if (sxz.length() > 0.5) {
          sxz.multiplyScalar(UNCONNECTED_PUSH);
          targetPositions.set(c, new THREE.Vector3(sxz.x, saved.y, sxz.y));
        } else {
          targetPositions.set(c, new THREE.Vector3(xz.x, cur.y, xz.y));
        }
      } else {
        targetPositions.set(c, new THREE.Vector3(xz.x, cur.y, xz.y));
      }
      targetOpacities.set(c, DIM_OPACITY);
    }

    // Start animation
    isAnimating = true;
    flowSystem.group.visible = false;
  }

  function reset() {
    if (!isFocused) return;

    // Restore all positions from saved
    targetPositions.clear();
    targetOpacities.clear();

    for (const mesh of sphereSystem.meshes) {
      const code = mesh.userData.sectorCode;
      const saved = savedPositions.get(code);
      if (saved) {
        targetPositions.set(code, saved.clone());
      }
      targetOpacities.set(code, NORMAL_OPACITY);
    }

    isAnimating = true;
    isFocused = false;
    focusedCode = null;
    flowSystem.group.visible = false;
  }

  function update(delta) {
    if (!isAnimating) return;

    let maxDist = 0;

    for (const mesh of sphereSystem.meshes) {
      const code = mesh.userData.sectorCode;

      // Position lerp
      const target = targetPositions.get(code);
      if (target) {
        mesh.position.lerp(target, LERP_FACTOR);
        const dist = mesh.position.distanceTo(target);
        if (dist > maxDist) maxDist = dist;
      }

      // Opacity lerp
      const targetOp = targetOpacities.get(code);
      if (targetOp !== undefined) {
        mesh.material.opacity += (targetOp - mesh.material.opacity) * LERP_FACTOR;
      }
    }

    // Check convergence
    if (maxDist < SETTLE_THRESHOLD) {
      // Snap to exact targets
      for (const mesh of sphereSystem.meshes) {
        const code = mesh.userData.sectorCode;
        const target = targetPositions.get(code);
        if (target) mesh.position.copy(target);

        const targetOp = targetOpacities.get(code);
        if (targetOp !== undefined) mesh.material.opacity = targetOp;
      }

      isAnimating = false;

      // Rebuild flow tubes at new positions
      flowSystem.rebuild();
      flowSystem.group.visible = true;

      // If focused, reapply highlight; if reset, clear highlight
      if (isFocused && focusedCode) {
        flowSystem.highlightSector(focusedCode);
      } else {
        flowSystem.resetHighlight();
      }

      // Clear saved positions on reset
      if (!isFocused) {
        savedPositions.clear();
      }
    }
  }

  return {
    focusOnSector,
    reset,
    update,
    get isFocused() { return isFocused; },
    get isAnimating() { return isAnimating; },
  };
}
