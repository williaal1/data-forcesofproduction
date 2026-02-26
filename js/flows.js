// =============================================================================
// flows.js — Inter-industry flow tubes (solid 3D, GPC style)
// Uses TubeGeometry (core Three.js) instead of Line2 addons
// =============================================================================

import * as THREE from 'three';
import { FLOWS, COLORS } from './config.js';

// Create a safe arc curve between two points with guaranteed non-collinear midpoint
function makeCurve(start, end, curveLift, seed) {
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const dist = start.distanceTo(end);

  // Lift midpoint
  mid.y += dist * curveLift;

  // Compute a perpendicular offset that works for ANY orientation
  const dir = end.clone().sub(start);
  if (dir.length() < 0.001) return null;
  dir.normalize();

  // Find a vector not parallel to dir, then cross product for perpendicular
  const ref = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const perp = new THREE.Vector3().crossVectors(dir, ref).normalize();

  // Deterministic lateral offset based on seed (avoids overlapping parallel flows)
  const angle = seed * 2.399; // golden angle for spread
  const perp2 = new THREE.Vector3().crossVectors(dir, perp).normalize();
  const offset = perp.clone().multiplyScalar(Math.cos(angle)).add(perp2.clone().multiplyScalar(Math.sin(angle)));
  mid.add(offset.multiplyScalar(dist * 0.06));

  return new THREE.CatmullRomCurve3([start, mid, end]);
}

export function createFlows(scene, flowsData, sphereMeshes) {
  const flowGroup = new THREE.Group();
  flowGroup.name = 'flows';

  const codeToMesh = {};
  for (const mesh of sphereMeshes) {
    codeToMesh[mesh.userData.sectorCode] = mesh;
  }

  // Sort by value descending and take top flows for performance + clarity
  const sortedFlows = [...flowsData].sort((a, b) => b.value - a.value);
  const MAX_FLOWS = 400; // top 400 flows — balance density vs readability
  const displayFlows = sortedFlows.slice(0, MAX_FLOWS);

  const maxFlow = Math.max(...displayFlows.map(f => f.value));
  const tubes = [];

  console.log(`Creating ${displayFlows.length} flow tubes (of ${flowsData.length} total)`);

  let skipped = 0;
  for (let i = 0; i < displayFlows.length; i++) {
    const flow = displayFlows[i];
    const sourceMesh = codeToMesh[flow.source];
    const targetMesh = codeToMesh[flow.target];
    if (!sourceMesh || !targetMesh) { skipped++; continue; }
    if (flow.source === flow.target) { skipped++; continue; }

    const start = sourceMesh.position.clone();
    const end = targetMesh.position.clone();
    const dist = start.distanceTo(end);
    if (dist < 0.1) { skipped++; continue; }

    const curve = makeCurve(start, end, FLOWS.curveLift, i);
    if (!curve) { skipped++; continue; }

    const normalizedValue = flow.value / maxFlow;
    const tubeRadius = FLOWS.minTubeRadius + normalizedValue * (FLOWS.maxTubeRadius - FLOWS.minTubeRadius);
    const opacity = FLOWS.minOpacity + normalizedValue * (FLOWS.maxOpacity - FLOWS.minOpacity);

    try {
      const geometry = new THREE.TubeGeometry(curve, 16, tubeRadius, 4, false);
      const material = new THREE.MeshStandardMaterial({
        color: COLORS.flowColor,
        transparent: true,
        opacity: opacity,
        roughness: 0.8,
        metalness: 0.0,
        depthWrite: false,
      });

      const tube = new THREE.Mesh(geometry, material);
      tube.renderOrder = 1;
      tube.userData = {
        source: flow.source,
        target: flow.target,
        value: flow.value,
        normalizedValue,
        baseOpacity: opacity,
        baseTubeRadius: tubeRadius,
        seed: i,
      };

      flowGroup.add(tube);
      tubes.push(tube);
    } catch (e) {
      console.warn(`Flow tube error (${flow.source}->${flow.target}):`, e.message);
      skipped++;
    }
  }
  if (skipped > 0) console.log(`Skipped ${skipped} degenerate flows`);

  scene.add(flowGroup);
  console.log(`Flow tubes created: ${tubes.length}`);

  return {
    group: flowGroup,
    lines: tubes,
    update() {},
    highlightSector(code) {
      for (const tube of tubes) {
        const connected = tube.userData.source === code || tube.userData.target === code;
        if (connected) {
          tube.material.opacity = 0.85;
          tube.material.color.set(COLORS.flowHighlight);
        } else {
          tube.material.opacity = 0.03;
        }
      }
    },
    resetHighlight() {
      for (const tube of tubes) {
        tube.material.opacity = tube.userData.baseOpacity;
        tube.material.color.set(COLORS.flowColor);
      }
    },
    rebuild() {
      for (const tube of tubes) {
        const sourceMesh = codeToMesh[tube.userData.source];
        const targetMesh = codeToMesh[tube.userData.target];
        if (!sourceMesh || !targetMesh) continue;

        const start = sourceMesh.position.clone();
        const end = targetMesh.position.clone();
        if (start.distanceTo(end) < 0.1) continue;

        const curve = makeCurve(start, end, FLOWS.curveLift, tube.userData.seed);
        if (!curve) continue;

        try {
          const newGeo = new THREE.TubeGeometry(curve, 16, tube.userData.baseTubeRadius, 4, false);
          tube.geometry.dispose();
          tube.geometry = newGeo;
        } catch (e) {
          // Skip degenerate rebuilds
        }
      }
    },
  };
}
