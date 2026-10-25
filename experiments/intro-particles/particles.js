import * as THREE from 'three';

// All motion is a function of scroll progress. There is deliberately no clock,
// simulation step or geometry allocation in update(), so scrubbing is reversible.
function randomSequence(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function heartField(x, y, z) {
  const q = x * x + y * y + 2.25 * z * z - 1;
  return q * q * q - x * x * y * y * y - 0.1125 * z * z * y * y * y;
}

function heartPoint(random) {
  // An implicit, volumetric heart, not a flat outline or a sprite. Most points
  // lie on its shell; a smaller population gives the silhouette genuine depth.
  const y = random() * 2 - 1;
  const azimuth = random() * Math.PI * 2;
  const ring = Math.sqrt(1 - y * y);
  const x = Math.cos(azimuth) * ring;
  const z = Math.sin(azimuth) * ring;
  let low = 0;
  let high = 2;
  for (let iteration = 0; iteration < 22; iteration += 1) {
    const middle = (low + high) * 0.5;
    if (heartField(x * middle, y * middle, z * middle) > 0) high = middle;
    else low = middle;
  }
  let radius = (low + high) * 0.5;
  if (random() < 0.18) radius *= Math.pow(random(), 1 / 3) * 0.91;
  // Recenter the unequal top/bottom extents without changing the contour.
  return [x * radius, y * radius - 0.13, z * radius];
}

const sharedVertex = /* glsl */ `
  uniform float uProgress;
  uniform float uScale;
  uniform float uProjectionScale;
  uniform float uPixelRatio;
  uniform vec3 uMerge;
  uniform mat3 uBasis;
  varying float vAlpha;
  varying float vSoftness;
  float phase(float start, float end) {
    return clamp((uProgress - start) / (end - start), 0.0, 1.0);
  }
  float smoothPhase(float start, float end) {
    float t = phase(start, end);
    return t * t * (3.0 - 2.0 * t);
  }
`;

const particleVertex = /* glsl */ `
  ${sharedVertex}
  attribute vec3 aHeart;
  attribute vec3 aExplosion;
  attribute vec3 aSeed;
  void main() {
    float burst = phase(0.595, 0.72);
    float expansion = 1.0 - pow(1.0 - burst, 3.0);
    float gather = smoothPhase(0.70, 0.845);
    float dissolve = smoothPhase(0.90, 0.995);
    float driftPhase = uProgress * 12.0 + aSeed.x * 6.2831853;

    vec3 flight = aExplosion * expansion * uScale * (1.35 + aSeed.y * 0.75);
    flight += vec3(sin(driftPhase), cos(driftPhase * 0.83),
                   sin(driftPhase * 0.71)) * sin(burst * 3.14159265)
                   * uScale * 0.11;

    // A small angle reveals the depth while keeping the heart readable on a phone.
    float angle = -0.17 + smoothPhase(0.76, 0.9) * 0.26;
    mat3 turn = mat3(cos(angle), 0.0, -sin(angle),
                     0.0, 1.0, 0.0,
                     sin(angle), 0.0, cos(angle));
    vec3 heart = turn * aHeart * uScale;
    vec3 localPosition = mix(flight, heart, gather);
    localPosition += (aExplosion * 1.5 + aHeart * 0.25)
                     * dissolve * dissolve * uScale;
    vec3 worldPosition = uMerge + uBasis * localPosition;
    vec4 viewPosition = modelViewMatrix * vec4(worldPosition, 1.0);
    gl_Position = projectionMatrix * viewPosition;

    float size = mix(0.025, 0.055, aSeed.z) * (uScale / 6.0);
    float sparkle = 0.76 + 0.24 * pow(0.5 + 0.5 * sin(driftPhase * 3.7), 6.0);
    gl_PointSize = clamp(size * uProjectionScale / max(0.5, -viewPosition.z),
                         1.5 * uPixelRatio, 3.2 * uPixelRatio);
    gl_PointSize *= mix(1.0, 0.55, dissolve);
    vAlpha = smoothPhase(0.592, 0.605) * (1.0 - dissolve)
             * mix(0.68, 1.0, aSeed.y) * sparkle;
    vSoftness = 0.0;
  }
`;

const starVertex = /* glsl */ `
  ${sharedVertex}
  uniform vec3 uOriginA;
  uniform vec3 uOriginB;
  attribute float aStar;
  attribute float aTail;
  attribute float aKind;
  attribute vec3 aSeed;
  vec3 trajectory(float t, vec3 origin, float side) {
    vec3 outward = normalize(origin);
    vec3 right = uBasis * vec3(1.0, 0.0, 0.0);
    vec3 up = uBasis * vec3(0.0, 1.0, 0.0);
    vec3 controlA = origin + outward * uScale * 0.62
                   + right * side * uScale * 0.50 + up * uScale * 0.20;
    vec3 controlB = uMerge + right * side * uScale * 0.72
                   + up * uScale * 0.48;
    float inverse = 1.0 - t;
    return inverse * inverse * inverse * origin
           + 3.0 * inverse * inverse * t * controlA
           + 3.0 * inverse * t * t * controlB + t * t * t * uMerge;
  }
  void main() {
    float travel = smoothPhase(0.27, 0.60);
    float tailDelay = aTail * 0.22;
    float t = clamp(travel - tailDelay, 0.0, 1.0);
    vec3 origin = aStar < 0.0 ? uOriginA : uOriginB;
    vec3 pointPosition = trajectory(t, origin, aStar);
    float spread = (0.007 + aTail * 0.025) * uScale;
    vec3 orbit = vec3(cos(aSeed.x * 6.2831853), sin(aSeed.x * 6.2831853),
                      sin(aSeed.y * 6.2831853));
    pointPosition += uBasis * orbit * spread * aSeed.z * (aKind < 0.5 ? 1.0 : 0.0);
    vec4 viewPosition = modelViewMatrix * vec4(pointPosition, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    float size = aKind > 1.5 ? 0.78 : (aKind > 0.5 ? 0.17 : 0.025);
    size *= uScale / 6.0;
    float maxSize = aKind > 1.5 ? 28.0 : (aKind > 0.5 ? 8.0 : 2.5);
    gl_PointSize = clamp(size * uProjectionScale / max(0.5, -viewPosition.z),
                         0.8 * uPixelRatio, maxSize * uPixelRatio);
    float appear = smoothPhase(0.265, 0.30);
    float vanish = 1.0 - smoothPhase(0.594, 0.625);
    float tailVisible = smoothstep(tailDelay, tailDelay + 0.045, travel);
    vAlpha = appear * vanish * (aKind < 0.5 ? tailVisible * pow(1.0 - aTail, 1.6)
                                      : (aKind > 1.5 ? 0.22 : 0.95));
    vSoftness = aKind > 1.5 ? 1.0 : 0.0;
  }
`;

const pointFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uDark;
  varying float vAlpha;
  varying float vSoftness;
  void main() {
    float radius = length(gl_PointCoord - vec2(0.5)) * 2.0;
    if (radius > 1.0 || vAlpha < 0.001) discard;
    float disc = 1.0 - smoothstep(0.18, 1.0, radius);
    float halo = exp(-radius * radius * 5.5) * (1.0 - smoothstep(0.75, 1.0, radius));
    float alpha = mix(disc, halo, vSoftness) * vAlpha;
    alpha *= mix(0.82, 1.0, uDark);
    gl_FragColor = vec4(uColor, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const flashVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const flashFragment = /* glsl */ `
  uniform float uProgress;
  uniform vec3 uColor;
  uniform float uDark;
  varying vec2 vUv;
  void main() {
    float t = clamp((uProgress - 0.593) / 0.052, 0.0, 1.0);
    float pulse = sin(t * 3.14159265);
    float radius = length(vUv - vec2(0.5)) * 2.0;
    float glow = exp(-radius * radius * 9.0 / max(0.07, pulse));
    float ring = exp(-pow((radius - t * 0.85) * 35.0, 2.0)) * 0.12;
    float alpha = (glow + ring) * pulse * mix(0.24, 0.6, uDark);
    if (alpha < 0.001) discard;
    gl_FragColor = vec4(uColor, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Isolated, deterministic GPU effect for intro-particles-test.html. */
export function createParticles({ count = 10000, mobile = false } = {}) {
  const particleCount = Math.max(3000, Math.min(16000, Math.round(count)));
  const random = randomSequence(0x534d2027);
  const group = new THREE.Group();
  group.name = 'intro-story-particles';
  const basisMatrix4 = new THREE.Matrix4();
  const identityQuaternion = new THREE.Quaternion();
  const drawingSize = new THREE.Vector2();
  const uniforms = {
    uProgress: { value: 0 },
    uScale: { value: 6 },
    uProjectionScale: { value: 650 },
    uPixelRatio: { value: 1 },
    uMerge: { value: new THREE.Vector3(0, 0, 19) },
    uOriginA: { value: new THREE.Vector3(0, 0, 12) },
    uOriginB: { value: new THREE.Vector3(0, 0, 12) },
    uBasis: { value: new THREE.Matrix3() },
    uColor: { value: new THREE.Color() },
    uDark: { value: 0 },
  };

  const heart = new Float32Array(particleCount * 3);
  const explosion = new Float32Array(particleCount * 3);
  const seeds = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i += 1) {
    heart.set(heartPoint(random), i * 3);
    const z = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const ring = Math.sqrt(1 - z * z);
    explosion.set([Math.cos(angle) * ring, Math.sin(angle) * ring, z], i * 3);
    seeds.set([random(), random(), random()], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3));
  geometry.setAttribute('aHeart', new THREE.BufferAttribute(heart, 3));
  geometry.setAttribute('aExplosion', new THREE.BufferAttribute(explosion, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));

  const materialOptions = {
    uniforms,
    fragmentShader: pointFragment,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
    toneMapped: false,
  };
  const material = new THREE.ShaderMaterial({ ...materialOptions, vertexShader: particleVertex });
  const particles = new THREE.Points(geometry, material);
  particles.name = 'burst-to-volumetric-heart';
  particles.frustumCulled = false;
  particles.renderOrder = 4;
  group.add(particles);

  const grainsPerStar = mobile ? 180 : 260;
  const starCount = (grainsPerStar + 2) * 2;
  const starGeometry = new THREE.BufferGeometry();
  const starSides = new Float32Array(starCount);
  const tails = new Float32Array(starCount);
  const kinds = new Float32Array(starCount);
  const starSeeds = new Float32Array(starCount * 3);
  let index = 0;
  for (const side of [-1, 1]) {
    for (let grain = 0; grain < grainsPerStar + 2; grain += 1) {
      starSides[index] = side;
      tails[index] = grain < grainsPerStar ? grain / (grainsPerStar - 1) : 0;
      kinds[index] = grain < grainsPerStar ? 0 : grain - grainsPerStar + 1;
      starSeeds.set([random(), random(), random()], index * 3);
      index += 1;
    }
  }
  starGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(starCount * 3), 3));
  starGeometry.setAttribute('aStar', new THREE.BufferAttribute(starSides, 1));
  starGeometry.setAttribute('aTail', new THREE.BufferAttribute(tails, 1));
  starGeometry.setAttribute('aKind', new THREE.BufferAttribute(kinds, 1));
  starGeometry.setAttribute('aSeed', new THREE.BufferAttribute(starSeeds, 3));
  const starMaterial = new THREE.ShaderMaterial({ ...materialOptions, vertexShader: starVertex });
  const stars = new THREE.Points(starGeometry, starMaterial);
  stars.name = 'two-geographic-stars-and-trails';
  stars.frustumCulled = false;
  stars.renderOrder = 5;
  group.add(stars);

  const flashGeometry = new THREE.PlaneGeometry(2, 2);
  const flashMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: flashVertex,
    fragmentShader: flashFragment,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  });
  const flash = new THREE.Mesh(flashGeometry, flashMaterial);
  flash.name = 'star-merger-light-pulse';
  flash.frustumCulled = false;
  flash.renderOrder = 6;
  group.add(flash);

  function projectionUniforms(renderer, scene, camera) {
    renderer.getDrawingBufferSize(drawingSize);
    uniforms.uProjectionScale.value = drawingSize.y * camera.projectionMatrix.elements[5] * 0.5;
    uniforms.uPixelRatio.value = renderer.getPixelRatio();
  }
  particles.onBeforeRender = projectionUniforms;
  stars.onBeforeRender = projectionUniforms;

  return {
    group,
    update({ progress, origins, merge, heartScale = 6, color, dark = 0, basis = identityQuaternion }) {
      const p = THREE.MathUtils.clamp(progress, 0, 1);
      uniforms.uProgress.value = p;
      uniforms.uScale.value = heartScale;
      uniforms.uOriginA.value.copy(origins[0]);
      uniforms.uOriginB.value.copy(origins[1]);
      uniforms.uMerge.value.copy(merge);
      uniforms.uColor.value.copy(color);
      uniforms.uDark.value = dark;
      basisMatrix4.makeRotationFromQuaternion(basis);
      uniforms.uBasis.value.setFromMatrix4(basisMatrix4);
      particles.visible = p > 0.591 && p < 0.996;
      stars.visible = p > 0.264 && p < 0.626;
      flash.visible = p > 0.593 && p < 0.645;
      flash.position.copy(merge);
      flash.quaternion.copy(basis);
      flash.scale.setScalar(heartScale * 0.72);
    },
    dispose() {
      geometry.dispose();
      starGeometry.dispose();
      flashGeometry.dispose();
      material.dispose();
      starMaterial.dispose();
      flashMaterial.dispose();
      group.clear();
    },
  };
}
