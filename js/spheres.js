// =============================================================================
// spheres.js — Sector sphere creation with ShaderMaterial + wireframe
// =============================================================================

import * as THREE from 'three';
import { COLORS, SPHERES, IP_COLOR_STOPS } from './config.js';
import { sphereVertexShader } from './shaders/sphere-vertex.js';
import { sphereFragmentShader } from './shaders/sphere-fragment.js';

// Interpolate IP growth to RGB color
function ipToColor(ipYoy) {
  if (ipYoy === null || ipYoy === undefined) {
    return new THREE.Color(COLORS.mediumTeal); // neutral for missing
  }

  const stops = IP_COLOR_STOPS;
  let t;
  if (ipYoy <= stops[0].value) {
    return new THREE.Color(...stops[0].color);
  } else if (ipYoy >= stops[stops.length - 1].value) {
    return new THREE.Color(...stops[stops.length - 1].color);
  } else if (ipYoy <= stops[1].value) {
    t = (ipYoy - stops[0].value) / (stops[1].value - stops[0].value);
    return new THREE.Color(
      stops[0].color[0] + t * (stops[1].color[0] - stops[0].color[0]),
      stops[0].color[1] + t * (stops[1].color[1] - stops[0].color[1]),
      stops[0].color[2] + t * (stops[1].color[2] - stops[0].color[2])
    );
  } else {
    t = (ipYoy - stops[1].value) / (stops[2].value - stops[1].value);
    return new THREE.Color(
      stops[1].color[0] + t * (stops[2].color[0] - stops[1].color[0]),
      stops[1].color[1] + t * (stops[2].color[1] - stops[1].color[1]),
      stops[1].color[2] + t * (stops[2].color[2] - stops[1].color[2])
    );
  }
}

// Compute sphere radius from GDP share
function gdpToRadius(gdpShare, maxGdpShare) {
  if (!gdpShare || !maxGdpShare) return SPHERES.minRadius;
  const normalized = Math.sqrt(gdpShare / maxGdpShare);
  return SPHERES.minRadius + normalized * (SPHERES.maxRadius - SPHERES.minRadius);
}

// Compute PPI intensity (0-1 normalized for shader)
function ppiToIntensity(ppiYoy) {
  if (ppiYoy === null || ppiYoy === undefined) return 0.05;
  return Math.min(Math.abs(ppiYoy) / 15.0, 1.0); // scale: 15% = max jaggedness
}

export function createSpheres(scene, sectors) {
  const geometry = new THREE.IcosahedronGeometry(1, SPHERES.icosaDetail);
  const sphereGroup = new THREE.Group();
  sphereGroup.name = 'spheres';

  const maxGdpShare = Math.max(...sectors.map(s => s.gdp_share || 0));
  const spheres = [];

  for (const sector of sectors) {
    const color = ipToColor(sector.ip_yoy);
    const radius = gdpToRadius(sector.gdp_share, maxGdpShare);
    const ppiIntensity = ppiToIntensity(sector.ppi_yoy);

    const material = new THREE.ShaderMaterial({
      vertexShader: sphereVertexShader,
      fragmentShader: sphereFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPpiIntensity: { value: ppiIntensity },
        uBreathing: { value: 0.03 },
        uScale: { value: radius },
        uColor: { value: color },
        uOpacity: { value: SPHERES.wireframeOpacity },
        uSelected: { value: 0.0 },
      },
      wireframe: true,
      transparent: true,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Y position from upstreamness (higher = more upstream)
    const y = (sector.upstreamness || 1) * SPHERES.upstreamnessScale + SPHERES.upstreamnessOffset;
    mesh.position.set(0, y, 0); // X/Z set by layout

    // Store sector data on mesh for raycasting
    mesh.userData = {
      sectorCode: sector.code,
      sectorData: sector,
      baseRadius: radius,
      targetY: y,
    };

    // Start invisible for materialization animation
    mesh.scale.set(0, 0, 0);

    sphereGroup.add(mesh);
    spheres.push(mesh);
  }

  scene.add(sphereGroup);

  return {
    group: sphereGroup,
    meshes: spheres,
    update(time) {
      for (const mesh of spheres) {
        mesh.material.uniforms.uTime.value = time;
      }
    },
  };
}
