// =============================================================================
// trade-shell.js — Outer hemisphere of country spheres
// =============================================================================

import * as THREE from 'three';
import { TRADE, COLORS } from './config.js';

// Fibonacci lattice on upper hemisphere
function fibonacciHemisphere(n, radius) {
  const points = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < n; i++) {
    // y: 0 to 1 (upper hemisphere only)
    const y = (i / (n - 1)) * 0.7 + 0.15; // avoid poles, range 0.15-0.85
    const r = Math.sqrt(1 - y * y) * radius;
    const theta = goldenAngle * i;

    points.push(new THREE.Vector3(
      Math.cos(theta) * r,
      y * radius,
      Math.sin(theta) * r
    ));
  }
  return points;
}

export function createTradeShell(scene, tradeData, sphereMeshes) {
  const tradeGroup = new THREE.Group();
  tradeGroup.name = 'trade';

  if (!tradeData || !tradeData.countries || tradeData.countries.length === 0) {
    scene.add(tradeGroup);
    return { group: tradeGroup, update() {} };
  }

  const countries = tradeData.countries;
  const n = countries.length;
  const positions = fibonacciHemisphere(n, TRADE.hemisphereRadius);

  // Build code → mesh lookup for connections
  const codeToMesh = {};
  for (const mesh of sphereMeshes) {
    codeToMesh[mesh.userData.sectorCode] = mesh;
  }

  const maxImport = Math.max(...countries.map(c => c.imports_billions));
  const geometry = new THREE.IcosahedronGeometry(1, TRADE.icosaDetail);
  const countryMeshes = [];

  for (let i = 0; i < n; i++) {
    const country = countries[i];
    const pos = positions[i];

    // Size by import volume
    const sizeNorm = Math.sqrt(country.imports_billions / maxImport);
    const radius = TRADE.minCountryRadius + sizeNorm * (TRADE.maxCountryRadius - TRADE.minCountryRadius);

    const material = new THREE.MeshBasicMaterial({
      color: COLORS.orange,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(pos);
    mesh.scale.set(radius, radius, radius);
    mesh.userData = {
      countryCode: country.code,
      countryData: country,
    };

    tradeGroup.add(mesh);
    countryMeshes.push(mesh);

    // Connection lines to primary domestic sectors
    if (country.sectors) {
      for (const sectorCode of country.sectors) {
        const sectorMesh = codeToMesh[sectorCode];
        if (!sectorMesh) continue;

        const points = [pos, sectorMesh.position.clone()];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({
          color: COLORS.orange,
          transparent: true,
          opacity: TRADE.connectionOpacity,
        });
        const line = new THREE.Line(lineGeo, lineMat);
        line.userData = {
          countryCode: country.code,
          sectorCode: sectorCode,
          sectorMesh: sectorMesh,
          countryPos: pos,
        };
        tradeGroup.add(line);
      }
    }
  }

  scene.add(tradeGroup);

  return {
    group: tradeGroup,
    countryMeshes,
    update() {
      // Update connection lines to track sector positions (after layout)
      for (const child of tradeGroup.children) {
        if (child.isLine && child.userData.sectorMesh) {
          const positions = child.geometry.attributes.position;
          const sectorPos = child.userData.sectorMesh.position;
          positions.setXYZ(1, sectorPos.x, sectorPos.y, sectorPos.z);
          positions.needsUpdate = true;
        }
      }
    },
  };
}
