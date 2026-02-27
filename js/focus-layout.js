// =============================================================================
// focus-layout.js — 2D supply chain diagram on sector selection
// Suppliers above, customers below, with dollar-value labels on flow lines
// =============================================================================

import * as THREE from 'three';

const LERP_FACTOR = 0.08;
const SETTLE_THRESHOLD = 0.05;
const SUPPLIER_Y = 6;
const CUSTOMER_Y = -6;
const ROW_SPACING = 3.5;
const MAX_CONNECTED = 8;
const NORMAL_OPACITY = 0.92;

// Colors for flow lines and labels
const SUPPLIER_COLOR = 0x00c0a3;  // mint
const CUSTOMER_COLOR = 0xf19953;  // orange

export function createFocusLayout(sphereSystem, flowSystem, scene) {
  const savedPositions = new Map();
  const targetPositions = new Map();
  const targetOpacities = new Map();
  let isAnimating = false;
  let isFocused = false;
  let focusedCode = null;
  let focusedFlowData = [];  // store flow info for creating lines/labels after settle

  // Groups for focus-mode overlays
  let focusFlowGroup = null;
  let focusLabelGroup = null;
  let focusLabels = [];
  let Text = null;  // troika Text constructor, loaded lazily
  const troikaReady = import('troika-three-text').then(mod => {
    Text = mod.Text;
  }).catch(() => {});

  function setSceneFloor(visible) {
    if (!scene) return;
    for (const child of scene.children) {
      if (child.name === 'grid' || child.name === 'ground') {
        child.visible = visible;
      }
    }
  }

  function saveCurrentPositions() {
    for (const mesh of sphereSystem.meshes) {
      savedPositions.set(mesh.userData.sectorCode, mesh.position.clone());
    }
  }

  // Arrange codes in a horizontal row centered on X=0
  // Sorted by value: biggest at center, alternating left/right
  function arrangeRow(codes, y) {
    const positions = new Map();
    const count = codes.length;
    if (count === 0) return positions;

    if (count === 1) {
      positions.set(codes[0], new THREE.Vector3(0, y, 0));
      return positions;
    }

    for (let i = 0; i < count; i++) {
      let slot;
      if (i === 0) {
        slot = 0;
      } else if (i % 2 === 1) {
        slot = Math.ceil(i / 2);
      } else {
        slot = -Math.ceil(i / 2);
      }
      positions.set(codes[i], new THREE.Vector3(slot * ROW_SPACING, y, 0));
    }
    return positions;
  }

  function formatValue(coefficient) {
    const dollars = coefficient * 100;
    if (dollars >= 10) return `$${dollars.toFixed(1)}`;
    if (dollars >= 1) return `$${dollars.toFixed(2)}`;
    return `$${dollars.toFixed(2)}`;
  }

  function getThemeColors() {
    const theme = window.__currentTheme;
    if (theme) {
      return {
        labelOutline: theme.labels?.outlineColor || '#f5f5f0',
        secondaryColor: theme.name === 'dark' ? '#8888aa' : '#777777',
      };
    }
    return { labelOutline: '#f5f5f0', secondaryColor: '#777777' };
  }

  function createFocusOverlays() {
    if (!scene) return;
    removeFocusOverlays();

    const selectedMesh = sphereSystem.meshes.find(
      m => m.userData.sectorCode === focusedCode
    );
    if (!selectedMesh) return;

    const selectedPos = selectedMesh.position;

    // --- Flow lines (synchronous) ---
    focusFlowGroup = new THREE.Group();
    focusFlowGroup.name = 'focus-flows';

    for (const fd of focusedFlowData) {
      const connMesh = sphereSystem.meshes.find(
        m => m.userData.sectorCode === fd.connectedCode
      );
      if (!connMesh) continue;

      const connPos = connMesh.position;
      const color = fd.isSupplier ? SUPPLIER_COLOR : CUSTOMER_COLOR;
      const opacity = 0.4 + (fd.normalizedValue * 0.5);

      const points = [selectedPos.clone(), connPos.clone()];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: Math.min(opacity, 0.9),
        depthWrite: false,
      });
      const line = new THREE.Line(geometry, material);
      line.renderOrder = 2;
      focusFlowGroup.add(line);
    }

    scene.add(focusFlowGroup);

    // --- Value labels (async — troika may still be loading) ---
    createValueLabels(selectedPos);
  }

  function makeSprite(text, color, scale) {
    const canvas = document.createElement('canvas');
    const w = 512;
    const h = 64;
    canvas.width = w;
    canvas.height = h;
    const ctx2d = canvas.getContext('2d');
    ctx2d.font = 'bold 28px "JetBrains Mono", monospace';
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'middle';
    // Outline
    ctx2d.strokeStyle = window.__currentTheme?.name === 'dark' ? '#0a0a1a' : '#f5f5f0';
    ctx2d.lineWidth = 5;
    ctx2d.strokeText(text, w / 2, h / 2);
    // Fill
    ctx2d.fillStyle = color;
    ctx2d.fillText(text, w / 2, h / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(scale || 3.5, 0.45, 1);
    return sprite;
  }

  async function createValueLabels(selectedPos) {
    await troikaReady;
    if (!isFocused) return;

    const { labelOutline, secondaryColor } = getThemeColors();

    focusLabelGroup = new THREE.Group();
    focusLabelGroup.name = 'focus-labels';
    focusLabels = [];

    for (const fd of focusedFlowData) {
      const connMesh = sphereSystem.meshes.find(
        m => m.userData.sectorCode === fd.connectedCode
      );
      if (!connMesh) continue;

      const mid = selectedPos.clone().add(connMesh.position).multiplyScalar(0.5);
      mid.x += 0.8;
      const color = fd.isSupplier ? '#00c0a3' : '#f19953';
      const valueText = formatValue(fd.value);

      if (Text) {
        const label = new Text();
        label.text = valueText;
        label.fontSize = 0.4;
        label.color = color;
        label.outlineWidth = 0.05;
        label.outlineColor = labelOutline;
        label.anchorX = 'left';
        label.anchorY = 'middle';
        label.depthOffset = -2;
        label.position.copy(mid);
        label.sync();
        focusLabelGroup.add(label);
        focusLabels.push(label);
      } else {
        const sprite = makeSprite(valueText, color);
        sprite.position.copy(mid);
        focusLabelGroup.add(sprite);
      }
    }

    // Context label
    const ctxText = '$ per $100 gross output';
    if (Text) {
      const ctx = new Text();
      ctx.text = ctxText;
      ctx.fontSize = 0.35;
      ctx.color = secondaryColor;
      ctx.outlineWidth = 0.04;
      ctx.outlineColor = labelOutline;
      ctx.anchorX = 'center';
      ctx.anchorY = 'top';
      ctx.depthOffset = -2;
      ctx.position.set(0, CUSTOMER_Y - 3, 0);
      ctx.sync();
      focusLabelGroup.add(ctx);
      focusLabels.push(ctx);
    } else {
      const sprite = makeSprite(ctxText, secondaryColor, 8);
      sprite.position.set(0, CUSTOMER_Y - 3, 0);
      focusLabelGroup.add(sprite);
    }

    scene.add(focusLabelGroup);
  }

  function removeFocusOverlays() {
    if (focusFlowGroup) {
      for (const child of focusFlowGroup.children) {
        child.geometry?.dispose();
        child.material?.dispose();
      }
      scene.remove(focusFlowGroup);
      focusFlowGroup = null;
    }

    if (focusLabelGroup) {
      for (const child of focusLabelGroup.children) {
        if (child.dispose) child.dispose();
      }
      scene.remove(focusLabelGroup);
      focusLabelGroup = null;
      focusLabels = [];
    }
  }

  function focusOnSector(code, flowsData) {
    focusedCode = code;

    // Remove any existing overlays (for sector-to-sector switching)
    removeFocusOverlays();

    // Save positions on first focus
    if (!isFocused) {
      saveCurrentPositions();
    }
    isFocused = true;

    const selectedMesh = sphereSystem.meshes.find(
      m => m.userData.sectorCode === code
    );
    if (!selectedMesh) return;

    // Compute connected sectors
    const supplierFlows = flowsData
      .filter(f => f.target === code && f.source !== code)
      .sort((a, b) => b.value - a.value)
      .slice(0, MAX_CONNECTED);

    const customerFlows = flowsData
      .filter(f => f.source === code && f.target !== code)
      .sort((a, b) => b.value - a.value)
      .slice(0, MAX_CONNECTED);

    const supplierCodes = supplierFlows.map(f => f.source);
    const customerCodes = customerFlows.map(f => f.target);
    const connectedSet = new Set([code, ...supplierCodes, ...customerCodes]);

    // Compute max value for normalization
    const allValues = [...supplierFlows, ...customerFlows].map(f => f.value);
    const maxVal = Math.max(...allValues, 0.001);

    // Store flow data for overlay creation after settle
    focusedFlowData = [
      ...supplierFlows.map(f => ({
        connectedCode: f.source,
        value: f.value,
        normalizedValue: f.value / maxVal,
        isSupplier: true,
      })),
      ...customerFlows.map(f => ({
        connectedCode: f.target,
        value: f.value,
        normalizedValue: f.value / maxVal,
        isSupplier: false,
      })),
    ];

    // Compute target positions — flat 2D layout
    targetPositions.clear();
    targetOpacities.clear();

    // Selected → center
    targetPositions.set(code, new THREE.Vector3(0, 0, 0));
    targetOpacities.set(code, 1.0);

    // Suppliers row above
    const supplierPositions = arrangeRow(supplierCodes, SUPPLIER_Y);
    for (const [c, pos] of supplierPositions) {
      targetPositions.set(c, pos);
      targetOpacities.set(c, NORMAL_OPACITY);
    }

    // Customers row below
    const customerPositions = arrangeRow(customerCodes, CUSTOMER_Y);
    for (const [c, pos] of customerPositions) {
      targetPositions.set(c, pos);
      targetOpacities.set(c, NORMAL_OPACITY);
    }

    // Unconnected → invisible, pushed far away
    for (const mesh of sphereSystem.meshes) {
      const c = mesh.userData.sectorCode;
      if (connectedSet.has(c)) continue;

      const saved = savedPositions.get(c) || mesh.position.clone();
      targetPositions.set(c, new THREE.Vector3(saved.x * 5, saved.y, -50));
      targetOpacities.set(c, 0);
    }

    isAnimating = true;
    flowSystem.group.visible = false;
    setSceneFloor(false);
  }

  function reset() {
    if (!isFocused) return;

    removeFocusOverlays();
    focusedFlowData = [];

    targetPositions.clear();
    targetOpacities.clear();

    for (const mesh of sphereSystem.meshes) {
      const code = mesh.userData.sectorCode;
      const saved = savedPositions.get(code);
      if (saved) {
        targetPositions.set(code, saved.clone());
      }
      targetOpacities.set(code, NORMAL_OPACITY);
    }

    isAnimating = true;
    isFocused = false;
    focusedCode = null;
    flowSystem.group.visible = false;
  }

  function update(delta, camera) {
    // Billboard focus labels toward camera
    if (focusLabels.length > 0 && camera) {
      for (const label of focusLabels) {
        label.quaternion.copy(camera.quaternion);
      }
    }

    if (!isAnimating) return;

    let maxDist = 0;

    for (const mesh of sphereSystem.meshes) {
      const code = mesh.userData.sectorCode;

      const target = targetPositions.get(code);
      if (target) {
        mesh.position.lerp(target, LERP_FACTOR);
        const dist = mesh.position.distanceTo(target);
        if (dist > maxDist) maxDist = dist;
      }

      const targetOp = targetOpacities.get(code);
      if (targetOp !== undefined) {
        mesh.material.opacity += (targetOp - mesh.material.opacity) * LERP_FACTOR;
      }
    }

    if (maxDist < SETTLE_THRESHOLD) {
      // Snap to exact targets
      for (const mesh of sphereSystem.meshes) {
        const code = mesh.userData.sectorCode;
        const target = targetPositions.get(code);
        if (target) mesh.position.copy(target);

        const targetOp = targetOpacities.get(code);
        if (targetOp !== undefined) mesh.material.opacity = targetOp;
      }

      isAnimating = false;

      if (isFocused && focusedCode) {
        // Create focus overlays (custom lines + value labels)
        createFocusOverlays();
      } else {
        // Reset complete — restore global flows and floor
        flowSystem.rebuild();
        flowSystem.group.visible = true;
        flowSystem.resetHighlight();
        setSceneFloor(true);
        savedPositions.clear();
      }
    }
  }

  return {
    focusOnSector,
    reset,
    update,
    get isFocused() { return isFocused; },
    get isAnimating() { return isAnimating; },
  };
}
