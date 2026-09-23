import { CRYSTAL_BOTTOM, CRYSTAL_HEIGHT, CRYSTAL_SOURCE_HEIGHTS } from '../animations/crystalEnergy'
import type { IUniform, WebGLProgramParametersWithUniforms } from 'three'

// Shared by the interior, physical shell, veins and edges in crystal-local space.
export const crystalFillGLSL = /* glsl */ `
  uniform float uEnergy;
  uniform float uTime;
  float crystalFill(vec3 p) {
    float height = (p.y - ${CRYSTAL_BOTTOM}) / ${CRYSTAL_HEIGHT};
    float distortion = sin(p.x * 8.0 + p.z * 5.0 + sin(p.y * 4.0)) * 0.023
      + sin(p.z * 13.0 - p.x * 6.0 + uTime * 0.28) * 0.013
      + sin(p.y * 17.0 + p.x * 11.0) * sin(p.z * 9.0) * 0.01;
    float fill = 1.0 - smoothstep(uEnergy - 0.045, uEnergy + 0.035, height + distortion);
    // The last few percent also charge the very tip, regardless of distortion.
    return mix(fill, 1.0, smoothstep(0.97, 1.0, uEnergy));
  }
`

export function applyCrystalShellEnergy(
  shader: Pick<WebGLProgramParametersWithUniforms, 'uniforms' | 'vertexShader' | 'fragmentShader'>,
  uniforms: Record<'uEnergy' | 'uTime' | 'uColor', IUniform>,
) {
  Object.assign(shader.uniforms, { uEnergy: uniforms.uEnergy, uTime: uniforms.uTime, uColor: uniforms.uColor })
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vCrystalPosition;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCrystalPosition = position;')
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${crystalFillGLSL}\nvarying vec3 vCrystalPosition;\nuniform vec3 uColor;`)
    .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      float crystalRegion = crystalFill(vCrystalPosition);
      roughnessFactor = mix(0.38, 0.17, crystalRegion);
      diffuseColor.rgb *= mix(0.82, 1.35, crystalRegion);`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += uColor * crystalFill(vCrystalPosition) * (0.65 + uEnergy * 0.4);`)
}

export const crystalVertexShader = /* glsl */ `
  varying vec3 vPosition;
  varying float vFacing;
  varying vec3 vToCamera;
  void main() {
    vPosition = position;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vToCamera = (inverse(modelViewMatrix) * vec4(0.0, 0.0, 0.0, 1.0)).xyz - position;
    vec3 radialNormal = normalize(vec3(position.x + 0.001, 0.0, position.z));
    vFacing = max(0.0, dot(normalize(normalMatrix * radialNormal), normalize(-viewPosition.xyz)));
    gl_Position = projectionMatrix * viewPosition;
  }
`

const energyField = crystalFillGLSL + /* glsl */ `
  uniform vec3 uColor;
  uniform vec4 uNodes;
  uniform float uBurst;
  varying vec3 vPosition;
  varying float vFacing;

  float nodeField(float y) {
    vec4 distanceToNodes = vec4(y) - vec4(${CRYSTAL_SOURCE_HEIGHTS.join(', ')});
    return dot(exp(-distanceToNodes * distanceToNodes * 15.0), uNodes);
  }
  float filledRegion() {
    return crystalFill(vPosition);
  }
  float overloadPulse() {
    return smoothstep(0.84, 1.0, uEnergy) * (0.5 + sin(uTime * 4.7) * 0.28 + sin(uTime * 8.3) * 0.16);
  }
`

export const energyFragmentShader = energyField + /* glsl */ `
  varying vec3 vToCamera;
  float bodyRadius(float y) {
    // Approximate the existing five rings, not another crystal model.
    if (y < -1.03) return mix(0.0, 0.36, clamp((y + 1.56) / 0.53, 0.0, 1.0));
    if (y < -0.57) return mix(0.36, 0.58, (y + 1.03) / 0.46);
    if (y < 0.02) return mix(0.58, 0.67, (y + 0.57) / 0.59);
    if (y < 0.57) return mix(0.67, 0.53, (y - 0.02) / 0.55);
    if (y < 1.02) return mix(0.53, 0.32, (y - 0.57) / 0.45);
    return mix(0.32, 0.0, clamp((y - 1.02) / 0.7, 0.0, 1.0));
  }
  void main() {
    // One back-face pass integrates a continuous luminous interior, independent
    // of uNodes. Sixteen bounded samples, no extra meshes, textures or lights.
    vec3 direction = normalize(vToCamera);
    vec3 inverseDirection = 1.0 / (direction + vec3(0.00001));
    vec3 farPlane = max((vec3(-0.76, -1.56, -0.76) - vPosition) * inverseDirection,
                       (vec3(0.76, 1.72, 0.76) - vPosition) * inverseDirection);
    float distance = max(0.0, min(farPlane.x, min(farPlane.y, farPlane.z)));
    float stepLength = distance / 16.0;
    float density = 0.0;
    for (int i = 0; i < 16; i++) {
      vec3 p = vPosition + direction * (float(i) + 0.5) * stepLength;
      float radius = max(0.001, bodyRadius(p.y));
      float interior = 1.0 - smoothstep(0.72, 1.0, length(p.xz) / radius);
      float variation = 0.9 + 0.1 * sin(p.x * 12.0 + p.z * 8.0 + sin(p.y * 7.0 - uTime * 0.35));
      density += interior * crystalFill(p) * variation * stepLength;
    }
    float alpha = (1.0 - exp(-density * 2.8)) * 0.84;
    vec3 color = mix(uColor, vec3(1.0), 0.035 + overloadPulse() * 0.06);
    gl_FragColor = vec4(color * (1.4 + uEnergy * 0.5 + overloadPulse() * 0.24 + uBurst * 0.2), alpha);
  }
`

export const veinFragmentShader = energyField + /* glsl */ `
  void main() {
    float a = abs(sin(vPosition.y * 8.6 + vPosition.x * 12.5 + sin(vPosition.z * 8.0) * 1.5));
    float b = abs(sin(vPosition.y * 11.2 - vPosition.z * 13.0 + vPosition.x * 3.2));
    float veins = max(pow(1.0 - a, 32.0), pow(1.0 - b, 38.0));
    float localEnergy = nodeField(vPosition.y);
    float pulse = pow(max(0.0, sin(vPosition.y * 6.0 - uTime * 2.2)), 8.0);
    float alpha = veins * filledRegion() * (0.09 + uEnergy * 0.22 + localEnergy * 0.15);
    if (alpha < 0.008) discard;
    vec3 color = mix(uColor, vec3(1.0), localEnergy * uEnergy * 0.32);
    gl_FragColor = vec4(color * (1.0 + pulse * 0.25 + overloadPulse() * 0.6 + uBurst * 0.4), alpha);
  }
`

export const edgeFragmentShader = energyField + /* glsl */ `
  void main() {
    float fill = filledRegion();
    float localEnergy = nodeField(vPosition.y);
    float pulse = overloadPulse();
    float alpha = (0.16 + fill * (0.36 + uEnergy * 0.25)) * (0.48 + vFacing * 0.52);
    vec3 color = mix(uColor, vec3(1.0), localEnergy * pulse * 0.35);
    gl_FragColor = vec4(color * (0.72 + fill * (0.9 + uEnergy * 0.48) + pulse * fill * 0.2), alpha);
  }
`

export const linkFragmentShader = energyField + /* glsl */ `
  void main() {
    float fill = filledRegion();
    float travellingPulse = pow(max(0.0, sin(vPosition.y * 6.5 - uTime * 2.5)), 10.0);
    // Suppress the dark conduits above the advancing front.
    float alpha = fill * (0.22 + travellingPulse * 0.35 + uBurst * 0.2);
    if (alpha < 0.01) discard;
    vec3 color = mix(uColor, vec3(1.0), 0.18 + travellingPulse * 0.22);
    gl_FragColor = vec4(color * (1.0 + uEnergy * 0.7 + overloadPulse()), alpha);
  }
`

export const haloVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`
export const haloFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float glow = pow(max(0.0, dot(normalize(vNormal), normalize(vView))), 2.5);
    gl_FragColor = vec4(uColor * 1.3, glow * uStrength * 0.22);
  }
`

export const particleVertexShader = /* glsl */ `
  uniform float uSize;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * (10.0 / -viewPosition.z);
    gl_Position = projectionMatrix * viewPosition;
  }
`
export const particleFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    float glow = 1.0 - smoothstep(0.05, 0.5, distance(gl_PointCoord, vec2(0.5)));
    gl_FragColor = vec4(uColor * 1.4, glow * uOpacity);
  }
`
