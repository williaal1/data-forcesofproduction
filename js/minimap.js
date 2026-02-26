// =============================================================================
// minimap.js — Side-view minimap (light theme)
// =============================================================================

import * as THREE from 'three';

export function createMinimap(camera, sphereMeshes, sectors) {
  const canvas = document.getElementById('minimap-canvas');
  if (!canvas) return { update() {} };
  const ctx = canvas.getContext('2d');

  const W = canvas.width;
  const H = canvas.height;
  const PAD = 14;

  const codeToSector = {};
  for (const s of sectors) codeToSector[s.code] = s;

  let minY = Infinity, maxY = -Infinity;
  for (const mesh of sphereMeshes) {
    const y = mesh.userData.targetY;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const yRange = maxY - minY || 1;
  minY -= yRange * 0.05;
  maxY += yRange * 0.05;

  const tiers = [
    { label: 'FINAL DEMAND', y: 0.0 },
    { label: 'DOWNSTREAM', y: 0.25 },
    { label: 'MID-STREAM', y: 0.5 },
    { label: 'UPSTREAM', y: 0.75 },
    { label: 'RAW INPUTS', y: 1.0 },
  ];

  const frustum = new THREE.Frustum();
  const projScreenMatrix = new THREE.Matrix4();

  function update() {
    ctx.clearRect(0, 0, W, H);

    // Light background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, W, H);

    let minX = Infinity, maxX = -Infinity;
    for (const mesh of sphereMeshes) {
      if (mesh.scale.x < 0.01) continue;
      if (mesh.position.x < minX) minX = mesh.position.x;
      if (mesh.position.x > maxX) maxX = mesh.position.x;
    }
    const xRange = (maxX - minX) || 1;
    const xPad = xRange * 0.15;

    function toMinimap(worldX, worldY) {
      const mx = PAD + ((worldX - (minX - xPad)) / (xRange + 2 * xPad)) * (W - 2 * PAD);
      const my = H - PAD - ((worldY - minY) / (maxY - minY)) * (H - 2 * PAD);
      return [mx, my];
    }

    // Tier lines
    ctx.font = '7px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    for (const tier of tiers) {
      const worldY = minY + tier.y * (maxY - minY);
      const [, my] = toMinimap(0, worldY);
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(PAD, my);
      ctx.lineTo(W - PAD, my);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillText(tier.label, W - PAD + 1, my - 2);
    }

    // Frustum
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);

    // Sector dots
    for (const mesh of sphereMeshes) {
      if (mesh.scale.x < 0.01) continue;
      const sector = codeToSector[mesh.userData.sectorCode];
      const [mx, my] = toMinimap(mesh.position.x, mesh.position.y);
      const baseR = mesh.userData.baseRadius || 1;
      const r = Math.max(1.5, baseR * 1.2);
      const inView = frustum.containsPoint(mesh.position);

      const ipYoy = sector ? sector.ip_yoy : null;
      let color;
      if (ipYoy === null || ipYoy === undefined) {
        color = `rgba(100, 100, 100, ${inView ? 0.7 : 0.3})`;
      } else if (ipYoy > 0) {
        color = `rgba(0, 192, 163, ${inView ? 0.9 : 0.35})`;
      } else {
        color = `rgba(253, 103, 106, ${inView ? 0.9 : 0.35})`;
      }

      const isSelected = mesh.material.emissiveIntensity > 0.2;

      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(mx, my, r + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Camera
    const camPos = camera.position;
    const [camMx, camMy] = toMinimap(camPos.x, camPos.y);
    const lookDir = new THREE.Vector3();
    camera.getWorldDirection(lookDir);
    const lookAngle = Math.atan2(-lookDir.y, lookDir.x);

    ctx.save();
    ctx.translate(camMx, camMy);
    ctx.rotate(lookAngle);

    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -3.5);
    ctx.lineTo(-4, 3.5);
    ctx.closePath();
    ctx.fillStyle = 'rgba(12, 66, 91, 0.7)';
    ctx.fill();
    ctx.strokeStyle = '#0c425b';
    ctx.lineWidth = 1;
    ctx.stroke();

    // FOV cone
    const fovRad = (camera.fov / 2) * Math.PI / 180;
    const coneLen = 22;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(coneLen, -Math.tan(fovRad) * coneLen);
    ctx.lineTo(coneLen, Math.tan(fovRad) * coneLen);
    ctx.closePath();
    ctx.fillStyle = 'rgba(12, 66, 91, 0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(12, 66, 91, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();

    // Y-axis label
    ctx.save();
    ctx.font = '7px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.textAlign = 'center';
    ctx.translate(7, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('UPSTREAMNESS', 0, 0);
    ctx.restore();
  }

  return { update };
}
