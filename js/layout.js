// =============================================================================
// layout.js — Self-contained 3D force-directed layout
// No d3-force-3d dependency (CDN builds are broken for 3D)
// Simple N^2 forces: charge repulsion + link attraction + centering + weak Y
// =============================================================================

import { LAYOUT } from './config.js';

export async function applyLayout(spheres, sectors, flows) {
  const N = sectors.length;

  // Build adjacency: code → index
  const codeToIndex = {};
  sectors.forEach((s, i) => { codeToIndex[s.code] = i; });

  // Build link list (filter self-loops, missing codes)
  const links = flows
    .filter(f => {
      const si = codeToIndex[f.source];
      const ti = codeToIndex[f.target];
      return si !== undefined && ti !== undefined && si !== ti;
    })
    .map(f => ({
      source: codeToIndex[f.source],
      target: codeToIndex[f.target],
      value: f.value,
    }));

  // Initialize node positions: Fibonacci sphere + slight upstreamness Y
  const pos = new Float64Array(N * 3);
  const vel = new Float64Array(N * 3);
  const targetY = new Float64Array(N);

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const mesh = spheres[i];
    const ty = mesh.userData.targetY;
    targetY[i] = ty;

    // Fibonacci sphere distribution for even initial spread
    const t = i / (N - 1);
    const phi = Math.acos(1 - 2 * t);
    const theta = goldenAngle * i;
    const r = 12;
    pos[i*3]   = Math.sin(phi) * Math.cos(theta) * r;
    pos[i*3+1] = Math.cos(phi) * r;
    pos[i*3+2] = Math.sin(phi) * Math.sin(theta) * r;
  }

  const chargeStr = LAYOUT.chargeStrength;   // negative = repulsion
  const linkDist = LAYOUT.linkDistance;
  const linkStr = LAYOUT.linkStrength;
  const centerStr = LAYOUT.centerStrength;
  const yStr = LAYOUT.yForceStrength || 0.03;
  const ticks = LAYOUT.warmupTicks;
  const damping = 0.85;
  const maxVelocity = 2.0;  // clamp per-axis velocity

  for (let tick = 0; tick < ticks; tick++) {
    const alpha = Math.max(0.001, 1 - tick / ticks); // cooling schedule

    // --- Many-body repulsion (Coulomb, N^2) ---
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = pos[j*3]   - pos[i*3];
        const dy = pos[j*3+1] - pos[i*3+1];
        const dz = pos[j*3+2] - pos[i*3+2];
        const distSq = dx*dx + dy*dy + dz*dz;
        const dist = Math.sqrt(distSq + 1.0); // softening: +1.0 prevents explosion
        // Repulsive force: F = charge * alpha / dist^2
        const force = chargeStr * alpha / (dist * dist);
        const fx = force * dx / dist;
        const fy = force * dy / dist;
        const fz = force * dz / dist;
        vel[i*3]   += fx;  vel[i*3+1] += fy;  vel[i*3+2] += fz;
        vel[j*3]   -= fx;  vel[j*3+1] -= fy;  vel[j*3+2] -= fz;
      }
    }

    // --- Link attraction (spring) ---
    for (const link of links) {
      const si = link.source, ti = link.target;
      const dx = pos[ti*3]   - pos[si*3];
      const dy = pos[ti*3+1] - pos[si*3+1];
      const dz = pos[ti*3+2] - pos[si*3+2];
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz + 0.01);
      const td = Math.max(2, linkDist / Math.max(link.value * 5, 0.1));
      const force = linkStr * (dist - td) * alpha / dist;
      vel[si*3]   += force * dx;  vel[si*3+1] += force * dy;  vel[si*3+2] += force * dz;
      vel[ti*3]   -= force * dx;  vel[ti*3+1] -= force * dy;  vel[ti*3+2] -= force * dz;
    }

    // --- Centering force ---
    for (let i = 0; i < N; i++) {
      vel[i*3]   -= pos[i*3]   * centerStr * alpha;
      vel[i*3+1] -= pos[i*3+1] * centerStr * alpha;
      vel[i*3+2] -= pos[i*3+2] * centerStr * alpha;
    }

    // --- Weak Y-force (upstreamness attractor) ---
    for (let i = 0; i < N; i++) {
      vel[i*3+1] += (targetY[i] - pos[i*3+1]) * yStr * alpha;
    }

    // --- Velocity clamping + integration + damping ---
    for (let i = 0; i < N * 3; i++) {
      vel[i] = Math.max(-maxVelocity, Math.min(maxVelocity, vel[i]));
      pos[i] += vel[i];
      vel[i] *= damping;
    }
  }

  // Verify no NaN
  let nanCount = 0;
  for (let i = 0; i < N * 3; i++) {
    if (isNaN(pos[i])) { nanCount++; pos[i] = 0; }
  }
  if (nanCount > 0) console.warn(`Layout: ${nanCount} NaN positions reset to 0`);

  // Apply positions to meshes
  for (let i = 0; i < N; i++) {
    spheres[i].position.x = pos[i*3];
    spheres[i].position.y = pos[i*3+1];
    spheres[i].position.z = pos[i*3+2];
    spheres[i].userData.targetY = pos[i*3+1];
  }

  // Log spread info
  const xs = Array.from({length: N}, (_, i) => pos[i*3]);
  const ys = Array.from({length: N}, (_, i) => pos[i*3+1]);
  const zs = Array.from({length: N}, (_, i) => pos[i*3+2]);
  const rng = arr => (Math.max(...arr) - Math.min(...arr)).toFixed(1);
  console.log(`Layout: ${N} nodes, ${links.length} links, ${ticks} ticks | spread X:${rng(xs)} Y:${rng(ys)} Z:${rng(zs)}`);
}
