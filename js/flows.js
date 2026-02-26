// =============================================================================
// flows.js — Inter-industry flow tubes (solid 3D, GPC style)
// Uses TubeGeometry (core Three.js) instead of Line2 addons
// =============================================================================

import * as THREE from 'three';
import { FLOWS, COLORS } from './config.js';

export function createFlows(scene, flowsData, sphereMeshes) {
  const flowGroup = new THREE.Group();
  flowGroup.name = 'flows';

  const codeToMesh = {};
  for (const mesh of sphereMeshes) {
    codeToMesh[mesh.userData.sectorCode] = mesh;
  }

  // Sort by value descending and take top flows for performance + clarity
  const sortedFlows = [...flowsData].sort((a, b) => b.value - a.value);
  const MAX_FLOWS = 300;
  const displayFlows = sortedFlows.slice(0, MAX_FLOWS);

  const maxFlow = Math.max(...displayFlows.map(f => f.value));
  const tubes = [];

  console.log(`Creating ${displayFlows.length} flow tubes (of ${flowsData.length} total)`);

  for (const flow of displayFlows) {
    const sourceMesh = codeToMesh[flow.source];
    const targetMesh = codeToMesh[flow.target];
    if (!sourceMesh || !targetMesh) continue;

    const start = sourceMesh.position.clone();
    const end = targetMesh.position.clone();

    // Arc midpoint — lift above straight line
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const dist = start.distanceTo(end);
    mid.y += dist * FLOWS.curveLift;

    // Slight lateral offset to reduce overlap
    const dir = end.clone().sub(start).normalize();
    const lateral = new THREE.Vector3(-dir.z, 0, dir.x);
    mid.add(lateral.multiplyScalar(dist * 0.05 * (Math.random() - 0.5)));

    const curve = new THREE.CatmullRomCurve3([start, mid, end]);

    // Tube radius from flow value
    const normalizedValue = flow.value / maxFlow;
    const tubeRadius = FLOWS.minTubeRadius + normalizedValue * (FLOWS.maxTubeRadius - FLOWS.minTubeRadius);
    const opacity = FLOWS.minOpacity + normalizedValue * (FLOWS.maxOpacity - FLOWS.minOpacity);

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
    };

    flowGroup.add(tube);
    tubes.push(tube);
  }

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
        const mid = start.clone().add(end).multiplyScalar(0.5);
        const dist = start.distanceTo(end);
        mid.y += dist * FLOWS.curveLift;

        const curve = new THREE.CatmullRomCurve3([start, mid, end]);
        const newGeo = new THREE.TubeGeometry(curve, 16, tube.userData.baseTubeRadius, 4, false);

        tube.geometry.dispose();
        tube.geometry = newGeo;
      }
    },
  };
}
