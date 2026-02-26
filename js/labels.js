// =============================================================================
// labels.js — troika-three-text sector labels (dark text, light theme)
// =============================================================================

import * as THREE from 'three';
import { LABELS } from './config.js';

let Text;

export async function createLabels(scene, sphereMeshes, sectors) {
  try {
    const troika = await import('troika-three-text');
    Text = troika.Text;
  } catch (e) {
    console.warn('troika-three-text unavailable, using sprite labels');
    return createSpriteLabels(scene, sphereMeshes, sectors);
  }

  const labelGroup = new THREE.Group();
  labelGroup.name = 'labels';
  const labels = [];

  const codeToSector = {};
  for (const s of sectors) codeToSector[s.code] = s;

  for (const mesh of sphereMeshes) {
    const sector = codeToSector[mesh.userData.sectorCode];
    if (!sector) continue;

    const label = new Text();
    label.text = sector.short_name || sector.name || sector.code;
    label.fontSize = LABELS.fontSize;
    label.color = LABELS.color;
    label.outlineWidth = LABELS.outlineWidth;
    label.outlineColor = LABELS.outlineColor;
    label.anchorX = 'center';
    label.anchorY = 'bottom';
    label.depthOffset = -1;

    const radius = mesh.userData.baseRadius || 1;
    label.position.copy(mesh.position);
    label.position.y += radius + 0.6;

    label.userData = {
      sectorCode: mesh.userData.sectorCode,
      parentMesh: mesh,
      fullName: sector.name || sector.code,
      shortName: sector.short_name || sector.code,
    };

    label.sync();
    labelGroup.add(label);
    labels.push(label);
  }

  scene.add(labelGroup);

  return {
    group: labelGroup,
    labels,
    update(camera) {
      for (const label of labels) {
        label.quaternion.copy(camera.quaternion);

        const mesh = label.userData.parentMesh;
        const radius = mesh.userData.baseRadius || 1;
        label.position.copy(mesh.position);
        label.position.y += radius * mesh.scale.x / (mesh.userData.baseRadius || 1) + 0.6;

        const dist = camera.position.distanceTo(label.position);
        if (dist < LABELS.nearDistance) {
          label.fillOpacity = 1.0;
          label.text = label.userData.fullName;
        } else if (dist > LABELS.farDistance) {
          label.fillOpacity = 0.0;
        } else {
          const t = (dist - LABELS.nearDistance) / (LABELS.farDistance - LABELS.nearDistance);
          label.fillOpacity = 1.0 - t;
          label.text = dist < (LABELS.nearDistance + LABELS.farDistance) / 2
            ? label.userData.fullName
            : label.userData.shortName;
        }
      }
    },
  };
}

function createSpriteLabels(scene, sphereMeshes, sectors) {
  const labelGroup = new THREE.Group();
  labelGroup.name = 'labels';
  const labels = [];

  const codeToSector = {};
  for (const s of sectors) codeToSector[s.code] = s;

  for (const mesh of sphereMeshes) {
    const sector = codeToSector[mesh.userData.sectorCode];
    if (!sector) continue;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = '18px "JetBrains Mono", monospace';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    ctx.fillText(sector.short_name || sector.code, 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(4, 1, 1);

    const radius = mesh.userData.baseRadius || 1;
    sprite.position.copy(mesh.position);
    sprite.position.y += radius + 0.8;

    sprite.userData = { sectorCode: mesh.userData.sectorCode, parentMesh: mesh };
    labelGroup.add(sprite);
    labels.push(sprite);
  }

  scene.add(labelGroup);

  return {
    group: labelGroup,
    labels,
    update(camera) {
      for (const sprite of labels) {
        const mesh = sprite.userData.parentMesh;
        const radius = mesh.userData.baseRadius || 1;
        sprite.position.copy(mesh.position);
        sprite.position.y += radius + 0.8;

        const dist = camera.position.distanceTo(sprite.position);
        sprite.material.opacity = dist < LABELS.nearDistance ? 1.0 :
          dist > LABELS.farDistance ? 0.0 :
          1.0 - (dist - LABELS.nearDistance) / (LABELS.farDistance - LABELS.nearDistance);
      }
    },
  };
}
