// =============================================================================
// minimap.js — Side-view minimap showing camera position in upstreamness space
// =============================================================================

import * as THREE from 'three';
import { COLORS } from './config.js';

export function createMinimap(camera, sphereMeshes, sectors) {
  const canvas = document.getElementById('minimap-canvas');
  if (!canvas) return { update() {} };
  const ctx = canvas.getContext('2d');

  const W = canvas.width;
  const H = canvas.height;
  const PAD = 12;

  // Precompute sector data for minimap
  const codeToSector = {};
  for (const s of sectors) codeToSector[s.code] = s;

  // Track Y range from spheres
  let minY = Infinity, maxY = -Infinity;
  let minX = Infinity, maxX = -Infinity;
  for (const mesh of sphereMeshes) {
    const y = mesh.userData.targetY;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  // Add some padding to range
  const yRange = maxY - minY || 1;
  minY -= yRange * 0.05;
  maxY += yRange * 0.05;

  // Upstreamness tier labels
  const tiers = [
    { label: 'FINAL DEMAND', y: 0.0 },
    { label: 'DOWNSTREAM', y: 0.25 },
    { label: 'MID-STREAM', y: 0.5 },
    { label: 'UPSTREAM', y: 0.75 },
    { label: 'RAW', y: 1.0 },
  ];

  // Frustum helper
  const frustum = new THREE.Frustum();
  const projScreenMatrix = new THREE.Matrix4();

  function update() {
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = 'rgba(7, 21, 32, 0.9)';
    ctx.fillRect(0, 0, W, H);

    // Border
    ctx.strokeStyle = 'rgba(12, 66, 91, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, W, H);

    // Compute X range dynamically from current sphere positions
    minX = Infinity; maxX = -Infinity;
    for (const mesh of sphereMeshes) {
      if (mesh.scale.x < 0.01) continue; // not yet materialized
      const x = mesh.position.x;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
    const xRange = (maxX - minX) || 1;
    const xPad = xRange * 0.15;

    // Map world coords to minimap coords
    // Minimap: X = horizontal, Y = vertical (upstreamness, bottom=downstream, top=upstream)
    function toMinimap(worldX, worldY) {
      const mx = PAD + ((worldX - (minX - xPad)) / (xRange + 2 * xPad)) * (W - 2 * PAD);
      const my = H - PAD - ((worldY - minY) / (maxY - minY)) * (H - 2 * PAD);
      return [mx, my];
    }

    // Draw upstreamness tier lines
    ctx.font = '7px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    for (const tier of tiers) {
      const worldY = minY + tier.y * (maxY - minY);
      const [, my] = toMinimap(0, worldY);

      ctx.strokeStyle = 'rgba(12, 66, 91, 0.3)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(PAD, my);
      ctx.lineTo(W - PAD, my);
      ctx.stroke();

      ctx.fillStyle = 'rgba(74, 142, 168, 0.5)';
      ctx.fillText(tier.label, W - PAD + 1, my - 2);
    }

    // Camera frustum check
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);

    // Draw sectors
    for (const mesh of sphereMeshes) {
      if (mesh.scale.x < 0.01) continue;
      const sector = codeToSector[mesh.userData.sectorCode];
      const [mx, my] = toMinimap(mesh.position.x, mesh.position.y);

      // Size based on GDP (scaled down for minimap)
      const baseR = mesh.userData.baseRadius || 1;
      const r = Math.max(1.5, baseR * 1.2);

      // Check if in camera view
      const inView = frustum.containsPoint(mesh.position);

      // Color from IP (simplified)
      const ipYoy = sector ? sector.ip_yoy : null;
      let color;
      if (ipYoy === null || ipYoy === undefined) {
        color = 'rgba(74, 142, 168, 0.6)'; // neutral
      } else if (ipYoy > 0) {
        color = `rgba(0, 192, 163, ${inView ? 0.9 : 0.4})`; // mint
      } else {
        color = `rgba(253, 103, 106, ${inView ? 0.9 : 0.4})`; // coral
      }

      // Selected sector gets a ring
      const isSelected = mesh.material.uniforms.uSelected.value > 0.5;

      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = '#c9e9f8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(mx, my, r + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      // In-view sectors get brighter outline
      if (inView && !isSelected) {
        ctx.strokeStyle = 'rgba(201, 233, 248, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    // Draw camera position and look direction
    const camPos = camera.position;
    const [camMx, camMy] = toMinimap(camPos.x, camPos.y);

    // Camera icon: small triangle showing look direction
    const lookDir = new THREE.Vector3();
    camera.getWorldDirection(lookDir);

    // Project look direction onto XY plane for minimap
    const lookAngle = Math.atan2(
      -(lookDir.y), // minimap Y is inverted
      lookDir.x
    );

    ctx.save();
    ctx.translate(camMx, camMy);
    ctx.rotate(lookAngle);

    // Camera triangle
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fillStyle = 'rgba(201, 233, 248, 0.8)';
    ctx.fill();
    ctx.strokeStyle = '#c9e9f8';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();

    // Draw camera view cone (FOV projection)
    const fovRad = (camera.fov / 2) * Math.PI / 180;
    const coneLen = 25;
    ctx.save();
    ctx.translate(camMx, camMy);
    ctx.rotate(lookAngle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(coneLen, -Math.tan(fovRad) * coneLen);
    ctx.lineTo(coneLen, Math.tan(fovRad) * coneLen);
    ctx.closePath();
    ctx.fillStyle = 'rgba(201, 233, 248, 0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(201, 233, 248, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();

    // Axis label
    ctx.save();
    ctx.font = '8px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(74, 142, 168, 0.7)';
    ctx.textAlign = 'center';
    ctx.translate(7, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('UPSTREAMNESS', 0, 0);
    ctx.restore();
  }

  return { update };
}
