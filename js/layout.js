// =============================================================================
// layout.js — d3-force-3d X/Z placement (Y fixed by upstreamness)
// =============================================================================

import { LAYOUT } from './config.js';

// Fallback layout: circular arrangement at each Y-level
function fallbackLayout(spheres, flows) {
  // Group by similar Y positions
  const sorted = [...spheres].sort((a, b) => a.userData.targetY - b.userData.targetY);
  const radius = 20;

  for (let i = 0; i < sorted.length; i++) {
    const angle = (i / sorted.length) * Math.PI * 2;
    const r = radius * (0.5 + 0.5 * Math.random());
    sorted[i].position.x = Math.cos(angle) * r;
    sorted[i].position.z = Math.sin(angle) * r;
  }
}

export async function applyLayout(spheres, sectors, flows) {
  // Try loading d3-force-3d
  let d3Force;
  try {
    // Try ESM import first
    d3Force = await import('https://cdn.jsdelivr.net/npm/d3-force-3d@3.0.5/+esm');
  } catch (e1) {
    try {
      // Fallback: load via script tag
      await new Promise((resolve, reject) => {
        if (window.d3) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/d3-force-3d@3.0.5/dist/d3-force-3d.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      d3Force = window.d3;
    } catch (e2) {
      console.warn('d3-force-3d unavailable, using fallback layout');
      fallbackLayout(spheres, flows);
      return;
    }
  }

  // Build nodes: index by sector code
  const codeToIndex = {};
  const nodes = sectors.map((s, i) => {
    codeToIndex[s.code] = i;
    const mesh = spheres[i];
    return {
      index: i,
      code: s.code,
      x: (Math.random() - 0.5) * 20,
      y: mesh.userData.targetY,
      z: (Math.random() - 0.5) * 20,
      fy: mesh.userData.targetY, // Fix Y
    };
  });

  // Build links from flows
  const links = flows
    .filter(f => codeToIndex[f.source] !== undefined && codeToIndex[f.target] !== undefined)
    .map(f => ({
      source: codeToIndex[f.source],
      target: codeToIndex[f.target],
      value: f.value,
    }));

  // Create simulation
  const forceSimulation = d3Force.forceSimulation || d3Force.default?.forceSimulation;
  const forceManyBody = d3Force.forceManyBody || d3Force.default?.forceManyBody;
  const forceLink = d3Force.forceLink || d3Force.default?.forceLink;
  const forceCenter = d3Force.forceCenter || d3Force.default?.forceCenter;

  if (!forceSimulation) {
    console.warn('d3-force-3d API not found, using fallback');
    fallbackLayout(spheres, flows);
    return;
  }

  const simulation = forceSimulation(nodes)
    .numDimensions(3)
    .force('charge', forceManyBody().strength(LAYOUT.chargeStrength))
    .force('link', forceLink(links)
      .distance(d => LAYOUT.linkDistance / Math.max(d.value * 10, 0.1))
      .strength(LAYOUT.linkStrength))
    .force('center', forceCenter(0, 0, 0).strength(LAYOUT.centerStrength))
    .stop();

  // Run synchronous ticks
  for (let i = 0; i < LAYOUT.warmupTicks; i++) {
    simulation.tick();
    // Re-fix Y after each tick (d3 may drift it)
    for (const node of nodes) {
      node.y = node.fy;
    }
  }

  // Apply positions to meshes
  for (let i = 0; i < nodes.length; i++) {
    spheres[i].position.x = nodes[i].x;
    // Y already set correctly
    spheres[i].position.z = nodes[i].z;
  }

  console.log(`Layout: ${nodes.length} nodes, ${links.length} links, ${LAYOUT.warmupTicks} ticks`);
}
