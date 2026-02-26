// =============================================================================
// sphere-fragment.js — Base color + rim lighting for wireframe spheres
// =============================================================================

export const sphereFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uSelected;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDisplacement;

  void main() {
    // Rim lighting: brighter at edges (Fresnel-like effect)
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
    rim = pow(rim, 2.0) * 0.5;

    // Displacement adds brightness variation
    float dispBright = abs(vDisplacement) * 2.0;

    // Selection highlight
    float selectionGlow = uSelected * 0.4;

    vec3 finalColor = uColor + rim * 0.3 + dispBright * 0.1 + selectionGlow;

    gl_FragColor = vec4(finalColor, uOpacity);
  }
`;
