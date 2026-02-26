// =============================================================================
// spheres.js — Solid sector spheres with MeshStandardMaterial
// =============================================================================

import * as THREE from 'three';
import { COLORS, SPHERES, IP_COLOR_STOPS, SECTOR_TYPE_COLORS } from './config.js';

// Interpolate IP growth to RGB color
function ipToColor(sector) {
  const ipYoy = sector.ip_yoy;

  // If no IP data, color by sector type
  if (ipYoy === null || ipYoy === undefined) {
    if (sector.is_manufacturing) return new THREE.Color(SECTOR_TYPE_COLORS.manufacturing);
    const code = sector.code;
    if (code.startsWith('G')) return new THREE.Color(SECTOR_TYPE_COLORS.government);
    if (['111CA', '113FF', '211', '212', '213'].includes(code)) {
      return new THREE.Color(SECTOR_TYPE_COLORS.resources);
    }
    return new THREE.Color(SECTOR_TYPE_COLORS.services);
  }

  const stops = IP_COLOR_STOPS;
  if (ipYoy <= stops[0].value) return new THREE.Color(...stops[0].color);
  if (ipYoy >= stops[2].value) return new THREE.Color(...stops[2].color);

  let t;
  if (ipYoy <= stops[1].value) {
    t = (ipYoy - stops[0].value) / (stops[1].value - stops[0].value);
    return new THREE.Color().lerpColors(
      new THREE.Color(...stops[0].color),
      new THREE.Color(...stops[1].color),
      t
    );
  } else {
    t = (ipYoy - stops[1].value) / (stops[2].value - stops[1].value);
    return new THREE.Color().lerpColors(
      new THREE.Color(...stops[1].color),
      new THREE.Color(...stops[2].color),
      t
    );
  }
}

function gdpToRadius(gdpShare, maxGdpShare) {
  if (!gdpShare || !maxGdpShare) return SPHERES.minRadius;
  const normalized = Math.sqrt(gdpShare / maxGdpShare);
  return SPHERES.minRadius + normalized * (SPHERES.maxRadius - SPHERES.minRadius);
}

export function createSpheres(scene, sectors) {
  const geometry = new THREE.SphereGeometry(1, SPHERES.geometryDetail, SPHERES.geometryDetail);
  const sphereGroup = new THREE.Group();
  sphereGroup.name = 'spheres';

  const maxGdpShare = Math.max(...sectors.map(s => s.gdp_share || 0));
  const spheres = [];

  for (const sector of sectors) {
    const color = ipToColor(sector);
    const radius = gdpToRadius(sector.gdp_share, maxGdpShare);

    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: SPHERES.metalness,
      roughness: SPHERES.roughness,
      transparent: true,
      opacity: 0.92,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;

    // Y position from upstreamness
    const y = (sector.upstreamness || 1) * SPHERES.upstreamnessScale + SPHERES.upstreamnessOffset;
    mesh.position.set(0, y, 0);

    mesh.userData = {
      sectorCode: sector.code,
      sectorData: sector,
      baseRadius: radius,
      targetY: y,
      baseColor: color.clone(),
    };

    // Start invisible for materialization
    mesh.scale.set(0, 0, 0);

    sphereGroup.add(mesh);
    spheres.push(mesh);
  }

  scene.add(sphereGroup);

  return {
    group: sphereGroup,
    meshes: spheres,
    update(time) {
      // Gentle breathing
      for (const mesh of spheres) {
        if (mesh.scale.x < 0.01) continue;
        const r = mesh.userData.baseRadius;
        const breath = 1.0 + Math.sin(time * Math.PI * 2 * 0.3) * 0.015;
        const s = r * breath;
        mesh.scale.set(s, s, s);
      }
    },
    // Set scale for animation (overrides breathing until materialized)
    setScale(mesh, s) {
      const r = mesh.userData.baseRadius;
      mesh.scale.set(r * s, r * s, r * s);
    },
  };
}
