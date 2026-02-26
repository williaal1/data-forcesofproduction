// =============================================================================
// trade-shell.js — Outer hemisphere of country spheres (solid, GPC style)
// =============================================================================

import * as THREE from 'three';
import { TRADE, COLORS } from './config.js';

function fibonacciHemisphere(n, radius) {
  const points = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = (i / (n - 1)) * 0.7 + 0.15;
    const r = Math.sqrt(1 - y * y) * radius;
    const theta = goldenAngle * i;
    points.push(new THREE.Vector3(Math.cos(theta) * r, y * radius, Math.sin(theta) * r));
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
  const positions = fibonacciHemisphere(countries.length, TRADE.hemisphereRadius);

  const codeToMesh = {};
  for (const mesh of sphereMeshes) codeToMesh[mesh.userData.sectorCode] = mesh;

  const maxImport = Math.max(...countries.map(c => c.imports_billions));
  const geometry = new THREE.SphereGeometry(1, 16, 16);

  for (let i = 0; i < countries.length; i++) {
    const country = countries[i];
    const pos = positions[i];
    const sizeNorm = Math.sqrt(country.imports_billions / maxImport);
    const radius = TRADE.minCountryRadius + sizeNorm * (TRADE.maxCountryRadius - TRADE.minCountryRadius);

    const material = new THREE.MeshStandardMaterial({
      color: COLORS.tradeColor,
      metalness: 0.1,
      roughness: 0.7,
      transparent: true,
      opacity: 0.7,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(pos);
    mesh.scale.set(radius, radius, radius);
    mesh.userData = { countryCode: country.code, countryData: country };
    tradeGroup.add(mesh);

    if (country.sectors) {
      for (const sectorCode of country.sectors) {
        const sectorMesh = codeToMesh[sectorCode];
        if (!sectorMesh) continue;

        const lineGeo = new THREE.BufferGeometry().setFromPoints([pos, sectorMesh.position.clone()]);
        const lineMat = new THREE.LineBasicMaterial({
          color: COLORS.tradeColor,
          transparent: true,
          opacity: TRADE.connectionOpacity,
        });
        const line = new THREE.Line(lineGeo, lineMat);
        line.userData = { countryCode: country.code, sectorCode, sectorMesh, countryPos: pos };
        tradeGroup.add(line);
      }
    }
  }

  scene.add(tradeGroup);

  return {
    group: tradeGroup,
    update() {
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
