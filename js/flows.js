// =============================================================================
// flows.js — Inter-industry flow curves (Line2 with animated dashes)
// =============================================================================

import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { FLOWS, COLORS } from './config.js';

export function createFlows(scene, flowsData, sphereMeshes) {
  const flowGroup = new THREE.Group();
  flowGroup.name = 'flows';

  // Build lookup: code → mesh position
  const codeToMesh = {};
  for (const mesh of sphereMeshes) {
    codeToMesh[mesh.userData.sectorCode] = mesh;
  }

  // Normalize flow values for line width / opacity
  const maxFlow = Math.max(...flowsData.map(f => f.value));
  const lines = [];

  for (const flow of flowsData) {
    const sourceMesh = codeToMesh[flow.source];
    const targetMesh = codeToMesh[flow.target];
    if (!sourceMesh || !targetMesh) continue;

    const start = sourceMesh.position.clone();
    const end = targetMesh.position.clone();

    // Midpoint lifted above the straight line
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const dist = start.distanceTo(end);
    mid.y += dist * FLOWS.curveLift;

    // Lateral offset to reduce overlap
    const dir = end.clone().sub(start).normalize();
    const lateral = new THREE.Vector3(-dir.z, 0, dir.x);
    mid.add(lateral.multiplyScalar(dist * 0.05 * (Math.random() - 0.5)));

    // Create curve
    const curve = new THREE.CatmullRomCurve3([start, mid, end]);
    const points = curve.getPoints(24);
    const positions = [];
    for (const p of points) {
      positions.push(p.x, p.y, p.z);
    }

    // Line geometry
    const geometry = new LineGeometry();
    geometry.setPositions(positions);

    // Normalize for width and opacity
    const normalizedValue = flow.value / maxFlow;
    const lineWidth = FLOWS.minLineWidth + normalizedValue * (FLOWS.maxLineWidth - FLOWS.minLineWidth);
    const opacity = FLOWS.minOpacity + normalizedValue * (FLOWS.maxOpacity - FLOWS.minOpacity);

    const material = new LineMaterial({
      color: COLORS.lightTeal,
      linewidth: lineWidth,
      transparent: true,
      opacity: opacity,
      dashed: true,
      dashSize: FLOWS.dashSize,
      gapSize: FLOWS.gapSize,
      depthWrite: false,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });

    const line = new Line2(geometry, material);
    line.computeLineDistances();
    line.userData = {
      source: flow.source,
      target: flow.target,
      value: flow.value,
    };

    flowGroup.add(line);
    lines.push(line);
  }

  scene.add(flowGroup);

  // Resize handler for LineMaterial resolution
  window.addEventListener('resize', () => {
    const res = new THREE.Vector2(window.innerWidth, window.innerHeight);
    for (const line of lines) {
      line.material.resolution = res;
    }
  });

  return {
    group: flowGroup,
    lines,
    update(time) {
      // Animate dash offset for directional flow
      for (const line of lines) {
        line.material.dashOffset -= FLOWS.animationSpeed;
      }
    },
    // Highlight flows connected to a sector
    highlightSector(code) {
      for (const line of lines) {
        const connected = line.userData.source === code || line.userData.target === code;
        line.material.opacity = connected
          ? Math.max(line.material.opacity, 0.6)
          : 0.02;
        if (connected) {
          line.material.color.set(COLORS.mint);
        } else {
          line.material.color.set(COLORS.darkTeal);
        }
      }
    },
    resetHighlight() {
      const maxFlow = Math.max(...flowsData.map(f => f.value));
      for (const line of lines) {
        const normalizedValue = line.userData.value / maxFlow;
        line.material.opacity = FLOWS.minOpacity + normalizedValue * (FLOWS.maxOpacity - FLOWS.minOpacity);
        line.material.color.set(COLORS.lightTeal);
      }
    },
    // Rebuild positions after layout changes
    rebuild() {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const sourceMesh = codeToMesh[line.userData.source];
        const targetMesh = codeToMesh[line.userData.target];
        if (!sourceMesh || !targetMesh) continue;

        const start = sourceMesh.position.clone();
        const end = targetMesh.position.clone();
        const mid = start.clone().add(end).multiplyScalar(0.5);
        const dist = start.distanceTo(end);
        mid.y += dist * FLOWS.curveLift;

        const curve = new THREE.CatmullRomCurve3([start, mid, end]);
        const points = curve.getPoints(24);
        const positions = [];
        for (const p of points) {
          positions.push(p.x, p.y, p.z);
        }

        line.geometry.setPositions(positions);
        line.computeLineDistances();
      }
    },
  };
}
