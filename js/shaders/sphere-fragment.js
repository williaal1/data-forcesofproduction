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
    // Subtle rim lighting (Fresnel)
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
    rim = pow(rim, 3.0) * 0.15;

    // Very subtle displacement brightness
    float dispBright = abs(vDisplacement) * 0.05;

    // Selection highlight
    float selectionGlow = uSelected * 0.25;

    // Keep output in a controlled range so bloom doesn't blow it out
    vec3 finalColor = uColor * 0.85 + rim + dispBright + selectionGlow;
    finalColor = min(finalColor, vec3(1.0));

    gl_FragColor = vec4(finalColor, uOpacity);
  }
`;
