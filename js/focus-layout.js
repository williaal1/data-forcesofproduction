// =============================================================================
// focus-layout.js — GPC-style 2D supply chain diagram on sector selection
// Flat circles with names inside, multi-row layout, value labels between rows
// =============================================================================

import * as THREE from 'three';

const LERP_FACTOR = 0.08;
const SETTLE_THRESHOLD = 0.05;
const NORMAL_OPACITY = 0.92;

// Layout constants
const ROW_GAP = 5.5;        // vertical distance between rows
const CIRCLE_SPACING = 4.0; // horizontal distance between circle centers
const MAX_PER_ROW = 8;      // max circles per row

// Circle sizes (sprite scale in world units)
const CIRCLE_SIZE = 3.2;
const SELECTED_CIRCLE_SIZE = 3.6;

// Color palettes by theme
const PALETTE = {
  light: {
    supplierFill: '#c8ebe3',
    supplierBorder: '#00c0a3',
    customerFill: '#fce0c4',
    customerBorder: '#f19953',
    selectedFill: '#333333',
    selectedBorder: '#222222',
    circleText: '#222222',
    selectedText: '#ffffff',
    valueBg: '#f5f5f0',
    secondary: '#777777',
  },
  dark: {
    supplierFill: '#1a3d35',
    supplierBorder: '#00c0a3',
    customerFill: '#3d2a18',
    customerBorder: '#f19953',
    selectedFill: '#ddddee',
    selectedBorder: '#aaaacc',
    circleText: '#e0e0e8',
    selectedText: '#111111',
    valueBg: '#0a0a1a',
    secondary: '#8888aa',
  },
};

const SUPPLIER_COLOR_HEX = '#00c0a3';
const CUSTOMER_COLOR_HEX = '#f19953';
const SUPPLIER_COLOR = 0x00c0a3;
const CUSTOMER_COLOR = 0xf19953;

export function createFocusLayout(sphereSystem, flowSystem, scene, controls) {
  const savedPositions = new Map();
  const targetPositions = new Map();
  const targetOpacities = new Map();
  let isAnimating = false;
  let isFocused = false;
  let focusedCode = null;
  let focusedFlowData = [];
  let layoutBounds = { minY: -5, maxY: 5 };

  // Overlay groups
  let focusCircleGroup = null;
  let focusFlowGroup = null;
  let focusLabelGroup = null;

  // ── Helpers ──────────────────────────────────────────────────────────────

  function getThemePalette() {
    const isDark = window.__currentTheme?.name === 'dark';
    return isDark ? PALETTE.dark : PALETTE.light;
  }

  function setSceneFloor(visible) {
    if (!scene) return;
    for (const child of scene.children) {
      if (child.name === 'grid' || child.name === 'ground') {
        child.visible = visible;
      }
    }
  }

  function setLabelsVisible(visible) {
    if (!scene) return;
    const labelGroup = scene.getObjectByName('labels');
    if (labelGroup) labelGroup.visible = visible;
  }

  function saveCurrentPositions() {
    for (const mesh of sphereSystem.meshes) {
      savedPositions.set(mesh.userData.sectorCode, mesh.position.clone());
    }
  }

  // ── Multi-row arrangement (balanced) ────────────────────────────────────

  // Distribute codes evenly across rows instead of filling MAX_PER_ROW then overflow.
  // E.g. 11 items → 6+5, not 10+1. 22 items → 8+7+7, not 10+10+2.
  function arrangeMultiRow(codes, direction) {
    const positions = new Map();
    const n = codes.length;
    if (n === 0) return positions;

    // Compute number of rows needed, then distribute evenly
    const numRows = Math.ceil(n / MAX_PER_ROW);
    const basePerRow = Math.floor(n / numRows);
    const extra = n % numRows; // first `extra` rows get basePerRow+1

    let idx = 0;
    for (let row = 0; row < numRows; row++) {
      const rowCount = basePerRow + (row < extra ? 1 : 0);
      const rowWidth = (rowCount - 1) * CIRCLE_SPACING;
      const startX = -rowWidth / 2;
      const y = direction * (row + 1) * ROW_GAP;

      for (let col = 0; col < rowCount; col++) {
        const x = startX + col * CIRCLE_SPACING;
        positions.set(codes[idx], new THREE.Vector3(x, y, 0));
        idx++;
      }
    }

    return positions;
  }

  // ── Canvas drawing ──────────────────────────────────────────────────────

  function makeCircleSprite(name, fillColor, borderColor, textColor, size) {
    const res = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = res;
    canvas.height = res;
    const ctx = canvas.getContext('2d');

    const cx = res / 2;
    const cy = res / 2;
    const r = res * 0.46; // slightly larger circle within canvas

    // Fill
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Border
    ctx.lineWidth = 8;
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    // Text — proportional font for compactness, large sizes for readability
    // At Z=25, a 3.2-unit sprite ≈ 119px on screen.
    // Canvas 1024 → 119px = 8.6:1 ratio. So 180px canvas font ≈ 21px screen.
    const maxTextWidth = r * 1.55;
    const fontFamily = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

    // Always try two-line for names > 8 chars that have spaces
    const useMultiLine = name.length > 8 && name.includes(' ');

    if (useMultiLine) {
      // Find best split point (closest to middle by pixel width)
      const words = name.split(' ');
      let bestSplit = 1;
      let bestDiff = Infinity;
      for (let s = 1; s < words.length; s++) {
        const l1 = words.slice(0, s).join(' ').length;
        const l2 = words.slice(s).join(' ').length;
        const diff = Math.abs(l1 - l2);
        if (diff < bestDiff) { bestDiff = diff; bestSplit = s; }
      }
      const line1 = words.slice(0, bestSplit).join(' ');
      const line2 = words.slice(bestSplit).join(' ');

      let fontSize = 160;
      ctx.font = `700 ${fontSize}px ${fontFamily}`;
      let w1 = ctx.measureText(line1).width;
      let w2 = ctx.measureText(line2).width;
      while (Math.max(w1, w2) > maxTextWidth && fontSize > 50) {
        fontSize -= 4;
        ctx.font = `700 ${fontSize}px ${fontFamily}`;
        w1 = ctx.measureText(line1).width;
        w2 = ctx.measureText(line2).width;
      }

      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const gap = fontSize * 1.2;
      ctx.fillText(line1, cx, cy - gap / 2);
      ctx.fillText(line2, cx, cy + gap / 2);
    } else {
      let fontSize = 200;
      ctx.font = `700 ${fontSize}px ${fontFamily}`;
      let metrics = ctx.measureText(name);
      while (metrics.width > maxTextWidth && fontSize > 50) {
        fontSize -= 4;
        ctx.font = `700 ${fontSize}px ${fontFamily}`;
        metrics = ctx.measureText(name);
      }

      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, cx, cy);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(size, size, 1);
    sprite.renderOrder = 3;
    return sprite;
  }

  function makeValueSprite(text, color) {
    const canvas = document.createElement('canvas');
    const w = 256;
    const h = 64;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const pal = getThemePalette();

    ctx.font = 'bold 28px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Outline for contrast against background
    ctx.strokeStyle = pal.valueBg;
    ctx.lineWidth = 5;
    ctx.strokeText(text, w / 2, h / 2);

    ctx.fillStyle = color;
    ctx.fillText(text, w / 2, h / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3.5, 0.45, 1);
    sprite.renderOrder = 4;
    return sprite;
  }

  function makeContextSprite(text, color) {
    const canvas = document.createElement('canvas');
    const w = 512;
    const h = 64;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const pal = getThemePalette();

    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = pal.valueBg;
    ctx.lineWidth = 4;
    ctx.strokeText(text, w / 2, h / 2);
    ctx.fillStyle = color;
    ctx.fillText(text, w / 2, h / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(8, 0.45, 1);
    sprite.renderOrder = 4;
    return sprite;
  }

  // ── Value formatting ────────────────────────────────────────────────────

  function formatValue(coefficient) {
    const dollars = coefficient * 100;
    if (dollars >= 10) return `$${dollars.toFixed(1)}`;
    if (dollars >= 1) return `$${dollars.toFixed(2)}`;
    return `$${dollars.toFixed(2)}`;
  }

  // ── Overlay creation (after settle) ─────────────────────────────────────

  function createFocusOverlays() {
    if (!scene) return;
    removeFocusOverlays();

    const selectedMesh = sphereSystem.meshes.find(
      m => m.userData.sectorCode === focusedCode
    );
    if (!selectedMesh) return;

    const pal = getThemePalette();

    // Hide sector labels and make all spheres invisible + zero-scale
    // (opacity 0 alone isn't enough — spheres still write to depth buffer and occlude sprites)
    setLabelsVisible(false);
    for (const mesh of sphereSystem.meshes) {
      mesh.material.opacity = 0;
      mesh.scale.set(0, 0, 0);
    }

    // ── Circle sprites ──
    focusCircleGroup = new THREE.Group();
    focusCircleGroup.name = 'focus-circles';

    // Selected sector circle
    const selectedName = selectedMesh.userData.sectorData?.short_name
      || selectedMesh.userData.sectorData?.name
      || focusedCode;
    const selectedCircle = makeCircleSprite(
      selectedName, pal.selectedFill, pal.selectedBorder, pal.selectedText, SELECTED_CIRCLE_SIZE
    );
    selectedCircle.position.copy(selectedMesh.position);
    selectedCircle.position.z = 0.1;
    focusCircleGroup.add(selectedCircle);

    // Connected sector circles
    for (const fd of focusedFlowData) {
      const connMesh = sphereSystem.meshes.find(
        m => m.userData.sectorCode === fd.connectedCode
      );
      if (!connMesh) continue;

      const name = connMesh.userData.sectorData?.short_name
        || connMesh.userData.sectorData?.name
        || fd.connectedCode;

      const fillColor = fd.isSupplier ? pal.supplierFill : pal.customerFill;
      const borderColor = fd.isSupplier ? pal.supplierBorder : pal.customerBorder;

      const circle = makeCircleSprite(name, fillColor, borderColor, pal.circleText, CIRCLE_SIZE);
      circle.position.copy(connMesh.position);
      circle.position.z = 0.1;
      focusCircleGroup.add(circle);
    }

    scene.add(focusCircleGroup);

    // ── Flow lines ──
    focusFlowGroup = new THREE.Group();
    focusFlowGroup.name = 'focus-flows';

    const selectedPos = selectedMesh.position;

    for (const fd of focusedFlowData) {
      const connMesh = sphereSystem.meshes.find(
        m => m.userData.sectorCode === fd.connectedCode
      );
      if (!connMesh) continue;

      const connPos = connMesh.position;
      const color = fd.isSupplier ? SUPPLIER_COLOR : CUSTOMER_COLOR;
      const opacity = 0.15 + (fd.normalizedValue * 0.2);

      const points = [selectedPos.clone(), connPos.clone()];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: Math.min(opacity, 0.35),
        depthWrite: false,
      });
      const line = new THREE.Line(geometry, material);
      line.renderOrder = 1;
      focusFlowGroup.add(line);
    }

    scene.add(focusFlowGroup);

    // ── Value labels (between rows) ──
    focusLabelGroup = new THREE.Group();
    focusLabelGroup.name = 'focus-labels';

    for (const fd of focusedFlowData) {
      const connMesh = sphereSystem.meshes.find(
        m => m.userData.sectorCode === fd.connectedCode
      );
      if (!connMesh) continue;

      const color = fd.isSupplier ? SUPPLIER_COLOR_HEX : CUSTOMER_COLOR_HEX;
      const valueText = formatValue(fd.value);

      const sprite = makeValueSprite(valueText, color);
      // Position: same X as connected circle, offset toward center by fixed amount
      // (midpoint strategy breaks in multi-row: row 2 midpoint lands on row 1)
      const offsetTowardCenter = connMesh.position.y > 0
        ? -ROW_GAP * 0.38    // below supplier circle
        : ROW_GAP * 0.38;    // above customer circle
      sprite.position.set(
        connMesh.position.x,
        connMesh.position.y + offsetTowardCenter,
        0.2
      );
      focusLabelGroup.add(sprite);
    }

    // Context label below everything
    const ctxSprite = makeContextSprite('$ per $100 gross output', pal.secondary);
    ctxSprite.position.set(0, layoutBounds.minY - 3, 0.2);
    focusLabelGroup.add(ctxSprite);

    scene.add(focusLabelGroup);
  }

  function removeFocusOverlays() {
    for (const groupRef of [focusCircleGroup, focusFlowGroup, focusLabelGroup]) {
      if (groupRef) {
        for (const child of groupRef.children) {
          if (child.material?.map) child.material.map.dispose();
          child.material?.dispose();
          child.geometry?.dispose();
        }
        scene.remove(groupRef);
      }
    }
    focusCircleGroup = null;
    focusFlowGroup = null;
    focusLabelGroup = null;
  }

  // ── Camera framing ──────────────────────────────────────────────────────

  function frameFocusLayout() {
    if (!controls || !controls.setLookAt) return;

    const totalHeight = layoutBounds.maxY - layoutBounds.minY + 8; // margin for circles + labels
    const totalWidth = (MAX_PER_ROW - 1) * CIRCLE_SPACING + CIRCLE_SIZE + 4;

    // Camera Z needed to see the full extent (assuming ~60deg FOV)
    const aspect = window.innerWidth / window.innerHeight;
    const fovRad = (60 * Math.PI) / 180;
    const zForHeight = (totalHeight / 2) / Math.tan(fovRad / 2);
    const zForWidth = (totalWidth / 2) / (aspect * Math.tan(fovRad / 2));
    const cameraZ = Math.max(25, Math.max(zForHeight, zForWidth) + 5);

    const centerY = (layoutBounds.maxY + layoutBounds.minY) / 2;
    controls.setLookAt(0, centerY, cameraZ, 0, centerY, 0, true);
  }

  // ── Main API ────────────────────────────────────────────────────────────

  function focusOnSector(code, flowsData) {
    focusedCode = code;
    removeFocusOverlays();

    // Restore sphere scale if switching from a previous focus (spheres were zeroed)
    for (const mesh of sphereSystem.meshes) {
      if (mesh.scale.x === 0) {
        const r = mesh.userData.baseRadius || 1;
        mesh.scale.set(r, r, r);
      }
    }

    if (!isFocused) {
      saveCurrentPositions();
    }
    isFocused = true;

    const selectedMesh = sphereSystem.meshes.find(
      m => m.userData.sectorCode === code
    );
    if (!selectedMesh) return;

    // Compute ALL connected sectors (no limit)
    const supplierFlows = flowsData
      .filter(f => f.target === code && f.source !== code)
      .sort((a, b) => b.value - a.value);

    const customerFlows = flowsData
      .filter(f => f.source === code && f.target !== code)
      .sort((a, b) => b.value - a.value);

    const supplierCodes = supplierFlows.map(f => f.source);
    const customerCodes = customerFlows.map(f => f.target);
    const connectedSet = new Set([code, ...supplierCodes, ...customerCodes]);

    // Normalize values
    const allValues = [...supplierFlows, ...customerFlows].map(f => f.value);
    const maxVal = Math.max(...allValues, 0.001);

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

    // Compute target positions — multi-row layout
    targetPositions.clear();
    targetOpacities.clear();

    // Selected → center
    targetPositions.set(code, new THREE.Vector3(0, 0, 0));
    targetOpacities.set(code, NORMAL_OPACITY);

    // Suppliers above (direction +1)
    const supplierPositions = arrangeMultiRow(supplierCodes, +1);
    for (const [c, pos] of supplierPositions) {
      targetPositions.set(c, pos);
      targetOpacities.set(c, NORMAL_OPACITY);
    }

    // Customers below (direction -1)
    const customerPositions = arrangeMultiRow(customerCodes, -1);
    for (const [c, pos] of customerPositions) {
      targetPositions.set(c, pos);
      targetOpacities.set(c, NORMAL_OPACITY);
    }

    // Compute layout bounds for camera
    let minY = 0, maxY = 0;
    for (const pos of targetPositions.values()) {
      if (pos.y < minY) minY = pos.y;
      if (pos.y > maxY) maxY = pos.y;
    }
    layoutBounds = { minY, maxY };

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

    // Frame the layout
    frameFocusLayout();
  }

  function reset() {
    if (!isFocused) return;

    removeFocusOverlays();
    focusedFlowData = [];

    // Show labels again
    setLabelsVisible(true);

    // Restore sphere scale (was zeroed during focus to avoid depth buffer occlusion)
    for (const mesh of sphereSystem.meshes) {
      const r = mesh.userData.baseRadius || 1;
      mesh.scale.set(r, r, r);
    }

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
