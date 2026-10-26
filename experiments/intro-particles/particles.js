import * as THREE from 'three';

// Auto-play and manual scrubbing both supply the same progress. No independent
// clock, simulation step or geometry allocation exists in update().
export const HEART_BOUNDS = Object.freeze({ width: 2.08, height: 2.24, depth: 1.24 });
function randomSequence(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function heartProfile() {
  // Original cubic silhouette: rounded shoulders, a deliberate cleft, a long
  // unbroken side curve and a narrow tip. Lofting gives it a rounded front/back.
  const left = [
    [[0, .52], [-.12, .99], [-.34, 1.14], [-.56, .98]],
    [[-.56, .98], [-.86, .99], [-1.08, .78], [-1.02, .43]],
    [[-1.02, .43], [-1, .10], [-.87, -.17], [-.67, -.43]],
    [[-.67, -.43], [-.49, -.66], [-.13, -.94], [0, -1.15]],
  ];
  const curves = [...left, ...left.slice().reverse().map(curve => curve.slice().reverse().map(([x, y]) => [-x, y]))];
  const points = [], lengths = [0];
  let total = 0;
  for (const curve of curves) {
    for (let i = 0; i < 64; i += 1) {
      const t = i / 64, s = 1 - t;
      const point = [0, 1].map(axis => curve[0][axis] * s ** 3 + 3 * curve[1][axis] * s * s * t + 3 * curve[2][axis] * s * t * t + curve[3][axis] * t ** 3);
      if (points.length) {
        const previous = points[points.length - 1];
        total += Math.hypot(point[0] - previous[0], point[1] - previous[1]);
        lengths.push(total);
      }
      points.push(point);
    }
  }
  const last = points[points.length - 1];
  total += Math.hypot(points[0][0] - last[0], points[0][1] - last[1]);
  points.push(points[0]); lengths.push(total);
  return random => {
    const distance = random() * total;
    let low = 0, high = lengths.length - 1;
    while (low + 1 < high) {
      const middle = (low + high) >> 1;
      if (lengths[middle] < distance) low = middle; else high = middle;
    }
    const mix = (distance - lengths[low]) / Math.max(.00001, lengths[high] - lengths[low]);
    const x = THREE.MathUtils.lerp(points[low][0], points[high][0], mix);
    const y = THREE.MathUtils.lerp(points[low][1], points[high][1], mix);
    const depth = random() * 2 - 1;
    const crossSection = Math.sqrt(1 - depth * depth);
    const volume = random() < .16 ? Math.pow(random(), 1 / 3) * .94 : 1;
    return [x * crossSection * volume, (y * crossSection + .045) * volume, depth * .62 * volume];
  };
}

function geographicSamples(positions, count, random) {
  const result = new Float32Array(count * 3);
  if (!positions?.length) return { result, radius: 12, available: false };
  if (positions.length % 6) throw new TypeError('Formation positions must be actual LineSegments XYZ pairs');
  const lengths = new Float64Array(positions.length / 6);
  let total = 0, radius = 0;
  for (let i = 0; i < lengths.length; i += 1) {
    const j = i * 6;
    const length = Math.hypot(positions[j + 3] - positions[j], positions[j + 4] - positions[j + 1], positions[j + 5] - positions[j + 2]);
    total += length; lengths[i] = total;
    radius += Math.hypot(positions[j], positions[j + 1], positions[j + 2]);
  }
  if (!Number.isFinite(total) || total <= 0) throw new TypeError('Invalid geographic formation geometry');
  radius /= lengths.length;
  for (let i = 0; i < count; i += 1) {
    const distance = random() * total;
    let low = 0, high = lengths.length - 1;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (lengths[middle] < distance) low = middle + 1; else high = middle;
    }
    const j = low * 6, mix = random();
    const x = THREE.MathUtils.lerp(positions[j], positions[j + 3], mix);
    const y = THREE.MathUtils.lerp(positions[j + 1], positions[j + 4], mix);
    const z = THREE.MathUtils.lerp(positions[j + 2], positions[j + 5], mix);
    const scale = radius / Math.hypot(x, y, z);
    result.set([x * scale, y * scale, z * scale], i * 3);
  }
  return { result, radius, available: true };
}

const sharedVertex = /* glsl */ `
  uniform float uProgress;
  uniform float uScale;
  uniform float uProjectionScale;
  uniform float uPixelRatio;
  uniform vec3 uMerge;
  uniform mat3 uBasis;
  uniform mat3 uStarBasis;
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
  attribute vec3 aFormation;
  attribute vec3 aScatter;
  void main() {
    float burst = phase(0.64, 0.74);
    float expansion = 1.0 - pow(1.0 - burst, 3.0);
    float gather = smoothPhase(0.735, 0.85);
    float dissolve = smoothPhase(0.95, 0.99);
    float driftPhase = uProgress * 17.0 + aSeed.x * 6.2831853;

    vec3 flight = aExplosion * expansion * uScale * (1.35 + aSeed.y * 0.75);
    flight += vec3(sin(driftPhase), cos(driftPhase * 0.83),
                   sin(driftPhase * 0.71)) * sin(burst * 3.14159265)
                   * uScale * 0.11;

    float hold = phase(0.85, 0.95);
    float heartbeat = pow(max(0.0, sin(hold * 12.5663706)), 3.0);
    float pulse = 1.0 + heartbeat * 0.026;
    float angle = -0.20 + smoothPhase(0.80, 0.95) * 0.36;
    mat3 turn = mat3(cos(angle), 0.0, -sin(angle),
                     0.0, 1.0, 0.0,
                     sin(angle), 0.0, cos(angle));
    vec3 heart = turn * aHeart * uScale * pulse;
    float wavePosition = mix(-1.35, 1.25, hold);
    float waveDistance = (aHeart.y - wavePosition) * 9.0;
    float lightWave = exp(-waveDistance * waveDistance)
                      * smoothPhase(0.84, 0.86) * (1.0 - dissolve);
    heart += normalize(aHeart + vec3(0.001)) * lightWave * uScale * 0.007;
    vec3 localPosition = mix(flight, heart, gather);
    localPosition += (aExplosion * 1.5 + aHeart * 0.25)
                     * dissolve * dissolve * uScale;
    vec3 worldPosition = uMerge + uBasis * localPosition;
    float formationAlpha = 0.0;
    if (uProgress < 0.18) {
      float stagger = aSeed.x * 0.022;
      float arrival = smoothPhase(0.008 + stagger, 0.125 + stagger);
      float spin = (1.0 - arrival) * (1.05 + aSeed.y * 0.35);
      mat3 orbit = mat3(cos(spin), 0.0, -sin(spin),
                        0.0, 1.0, 0.0,
                        sin(spin), 0.0, cos(spin));
      worldPosition = mix(orbit * aScatter, aFormation, arrival);
      worldPosition += normalize(aScatter) * sin(arrival * 3.14159265)
                       * sin(driftPhase) * 0.5;
      formationAlpha = smoothPhase(0.0, 0.012) * (1.0 - smoothPhase(0.13, 0.16));
    }
    vec4 viewPosition = modelViewMatrix * vec4(worldPosition, 1.0);
    gl_Position = projectionMatrix * viewPosition;

    float size = mix(0.018, 0.042, aSeed.z) * (uScale / 6.0);
    if (uProgress < 0.18) size = mix(0.018, 0.039, aSeed.z);
    float sparkle = 0.76 + 0.24 * pow(0.5 + 0.5 * sin(driftPhase * 3.7), 6.0);
    gl_PointSize = clamp(size * uProjectionScale / max(0.5, -viewPosition.z),
                         0.95 * uPixelRatio, 2.6 * uPixelRatio);
    gl_PointSize *= mix(1.0, 0.55, dissolve) * (1.0 + lightWave * 0.12);
    vAlpha = (smoothPhase(0.638, 0.652) * (1.0 - dissolve)
             + formationAlpha) * mix(0.58, 1.0, aSeed.y)
             * sparkle * (0.88 + lightWave * 0.35);
    vSoftness = 0.0;
  }
`;

const starVertex = /* glsl */ `
  ${sharedVertex}
  uniform vec3 uOriginA;
  uniform vec3 uOriginB;
  uniform vec3 uAnchorA;
  uniform vec3 uAnchorB;
  uniform vec3 uControlAA;
  uniform vec3 uControlAB;
  uniform vec3 uControlBA;
  uniform vec3 uControlBB;
  attribute float aStar;
  attribute float aTail;
  attribute float aKind;
  attribute vec3 aSeed;
  vec3 trajectory(float progress, vec3 origin, float side) {
    float t = clamp((progress - 0.405) / 0.235, 0.0, 1.0);
    t = t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
    float lift = clamp((progress - 0.37) / 0.06, 0.0, 1.0);
    lift = lift * lift * (3.0 - 2.0 * lift) * 1.45;
    vec3 outward = normalize(origin);
    vec3 right = uStarBasis * vec3(1.0, 0.0, 0.0);
    vec3 up = uStarBasis * vec3(0.0, 1.0, 0.0);
    vec3 forward = uStarBasis * vec3(0.0, 0.0, 1.0);
    vec3 anchor = side > 0.0 ? uAnchorA : uAnchorB;
    vec3 controlA = side > 0.0 ? uControlAA : uControlBA;
    vec3 controlB = side > 0.0 ? uControlAB : uControlBB;
    float inverse = 1.0 - t;
    vec3 position = inverse * inverse * inverse * anchor
           + 3.0 * inverse * inverse * t * controlA
           + 3.0 * inverse * t * t * controlB + t * t * t * uMerge;
    position += outward * (lift - 1.45) * inverse * inverse * inverse;
    float curveWave = sin(t * 3.14159265);
    float envelope = curveWave * curveWave;
    float angle = t * (side > 0.0 ? 6.9 : 5.3) + side * 0.7;
    position += (right * cos(angle) * side + up * sin(angle) * 0.72)
                * envelope * uScale * 0.13;
    position += forward * sin(t * 6.2831853) * envelope * uScale * 0.075;
    // Once the camera is well clear, lift the arcs beyond Earth's silhouette.
    // This late loft cannot push a star through the close-up camera.
    float loftPhase = clamp((progress - 0.50) / 0.14, 0.0, 1.0);
    float loft = sin(loftPhase * 3.14159265);
    position += up * uScale * (side > 0.0 ? 0.75 : 0.62) * loft * loft;
    // Keep the two cores legible as separate stars through their high arc;
    // converge only for the intentional merger, rather than crossing early.
    float separation = smoothstep(0.50, 0.54, progress)
                       * (1.0 - smoothstep(0.605, 0.64, progress));
    position += right * side * uScale * 0.22 * separation;
    return position;
  }
  void main() {
    float tailDelay = aTail * 0.07;
    vec3 origin = aStar > 0.0 ? uOriginA : uOriginB;
    vec3 pointPosition = trajectory(uProgress - tailDelay, origin, aStar);
    float spread = (0.005 + aTail * 0.012) * uScale;
    vec3 orbit = vec3(cos(aSeed.x * 6.2831853), sin(aSeed.x * 6.2831853),
                      sin(aSeed.y * 6.2831853));
    pointPosition += uStarBasis * orbit * spread * aSeed.z * (aKind < 0.5 ? 1.0 : 0.0);
    vec4 viewPosition = modelViewMatrix * vec4(pointPosition, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    float size = aKind > 1.5 ? 0.78 : (aKind > 0.5 ? 0.17 : 0.025);
    size *= clamp(uScale / 6.0, 0.8, 2.0);
    float maxSize = aKind > 1.5 ? 28.0 : (aKind > 0.5 ? 8.0 : 2.5);
    gl_PointSize = clamp(size * uProjectionScale / max(0.5, -viewPosition.z),
                         0.8 * uPixelRatio, maxSize * uPixelRatio);
    float appear = smoothPhase(0.367, 0.389);
    float vanish = 1.0 - smoothPhase(0.638, 0.66);
    float tailVisible = smoothstep(0.37 + tailDelay, 0.39 + tailDelay, uProgress);
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
    float t = clamp((uProgress - 0.638) / 0.052, 0.0, 1.0);
    float pulse = sin(t * 3.14159265);
    float radius = length(vUv - vec2(0.5)) * 2.0;
    float glow = exp(-radius * radius * 9.0 / max(0.07, pulse));
    float ringDistance = (radius - t * 0.85) * 35.0;
    float ring = exp(-ringDistance * ringDistance) * 0.12;
    float alpha = (glow + ring) * pulse * mix(0.24, 0.6, uDark);
    if (alpha < 0.001) discard;
    gl_FragColor = vec4(uColor, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Isolated, deterministic GPU effect for intro-particles-test.html. */
export function createParticles({ count = 10000, mobile = false, formationPositions } = {}) {
  const particleCount = Math.max(3000, Math.min(16000, Math.round(count)));
  const random = randomSequence(0x534d2027);
  const group = new THREE.Group();
  group.name = 'intro-story-particles';
  const basisMatrix4 = new THREE.Matrix4();
  const starBasisMatrix4 = new THREE.Matrix4();
  const identityQuaternion = new THREE.Quaternion();
  const drawingSize = new THREE.Vector2();
  const right = new THREE.Vector3(), up = new THREE.Vector3(), forward = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const uniforms = {
    uProgress: { value: 0 },
    uScale: { value: 6 },
    uProjectionScale: { value: 650 },
    uPixelRatio: { value: 1 },
    uMerge: { value: new THREE.Vector3(0, 0, 19) },
    uOriginA: { value: new THREE.Vector3(0, 0, 12) },
    uOriginB: { value: new THREE.Vector3(0, 0, 12) },
    uAnchorA: { value: new THREE.Vector3() },
    uAnchorB: { value: new THREE.Vector3() },
    uControlAA: { value: new THREE.Vector3() },
    uControlAB: { value: new THREE.Vector3() },
    uControlBA: { value: new THREE.Vector3() },
    uControlBB: { value: new THREE.Vector3() },
    uBasis: { value: new THREE.Matrix3() },
    uStarBasis: { value: new THREE.Matrix3() },
    uColor: { value: new THREE.Color() },
    uDark: { value: 0 },
  };

  const heart = new Float32Array(particleCount * 3);
  const explosion = new Float32Array(particleCount * 3);
  const seeds = new Float32Array(particleCount * 3);
  const scatter = new Float32Array(particleCount * 3);
  const formation = geographicSamples(formationPositions, particleCount, random);
  const sampleHeart = heartProfile();
  for (let i = 0; i < particleCount; i += 1) {
    heart.set(sampleHeart(random), i * 3);
    const z = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const ring = Math.sqrt(1 - z * z);
    explosion.set([Math.cos(angle) * ring, Math.sin(angle) * ring, z], i * 3);
    seeds.set([random(), random(), random()], i * 3);
    const scatterRadius = formation.radius * (1.65 + random() * 1.15);
    scatter.set([Math.cos(angle) * ring * scatterRadius, Math.sin(angle) * ring * scatterRadius, z * scatterRadius], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3));
  geometry.setAttribute('aHeart', new THREE.BufferAttribute(heart, 3));
  geometry.setAttribute('aExplosion', new THREE.BufferAttribute(explosion, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
  geometry.setAttribute('aFormation', new THREE.BufferAttribute(formation.result, 3));
  geometry.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));

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
  particles.name = 'geographic-formation-burst-volumetric-heart';
  particles.frustumCulled = false;
  particles.renderOrder = 4;
  group.add(particles);

  const grainsPerStar = mobile ? 320 : 420;
  const starCount = (grainsPerStar + 2) * 2;
  const starGeometry = new THREE.BufferGeometry();
  const starSides = new Float32Array(starCount);
  const tails = new Float32Array(starCount);
  const kinds = new Float32Array(starCount);
  const starSeeds = new Float32Array(starCount * 3);
  let index = 0;
  for (const side of [1, -1]) {
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

  function configureCurve(origin, side, anchor, controlA, controlB, heartScale) {
    normal.copy(origin).normalize();
    anchor.copy(origin).addScaledVector(normal, 1.45);
    controlA.copy(anchor).addScaledVector(forward, side > 0 ? 2.8 : 3.6)
      .addScaledVector(right, side * heartScale * (side > 0 ? .62 : .49))
      .addScaledVector(up, heartScale * (side > 0 ? .42 : .62));
    controlB.copy(uniforms.uMerge.value).addScaledVector(forward, 1.8)
      .addScaledVector(right, -side * heartScale * .22)
      .addScaledVector(up, heartScale * (side > 0 ? .30 : .39));
  }

  // Read-only numerical sampler of the same controls and curve used by GLSL.
  // Helpful for checking camera clearance without creating a WebGL renderer.
  function sampleStarPath(progress, index, target = new THREE.Vector3()) {
    const side = index === 0 ? 1 : -1;
    const origin = index === 0 ? uniforms.uOriginA.value : uniforms.uOriginB.value;
    const anchor = index === 0 ? uniforms.uAnchorA.value : uniforms.uAnchorB.value;
    const controlA = index === 0 ? uniforms.uControlAA.value : uniforms.uControlBA.value;
    const controlB = index === 0 ? uniforms.uControlAB.value : uniforms.uControlBB.value;
    let t = THREE.MathUtils.clamp((progress - .405) / .235, 0, 1);
    t = t * t * t * (t * (t * 6 - 15) + 10);
    const inverse = 1 - t;
    const lift = THREE.MathUtils.smoothstep(progress, .37, .43) * 1.45;
    target.copy(anchor).multiplyScalar(inverse ** 3)
      .addScaledVector(controlA, 3 * inverse * inverse * t)
      .addScaledVector(controlB, 3 * inverse * t * t)
      .addScaledVector(uniforms.uMerge.value, t ** 3);
    normal.copy(origin).normalize();
    target.addScaledVector(normal, (lift - 1.45) * inverse ** 3);
    const envelope = Math.sin(t * Math.PI) ** 2;
    const angle = t * (side > 0 ? 6.9 : 5.3) + side * .7;
    target.addScaledVector(right, Math.cos(angle) * side * envelope * uniforms.uScale.value * .13)
      .addScaledVector(up, Math.sin(angle) * .72 * envelope * uniforms.uScale.value * .13)
      .addScaledVector(forward, Math.sin(t * Math.PI * 2) * envelope * uniforms.uScale.value * .075);
    const loft = Math.sin(THREE.MathUtils.clamp((progress - .50) / .14, 0, 1) * Math.PI);
    target.addScaledVector(up, uniforms.uScale.value * (side > 0 ? .75 : .62) * loft * loft);
    const separation = THREE.MathUtils.smoothstep(progress, .50, .54)
      * (1 - THREE.MathUtils.smoothstep(progress, .605, .64));
    target.addScaledVector(right, side * uniforms.uScale.value * .22 * separation);
    return target;
  }

  return {
    group,
    sampleStarPath,
    update({ progress, origins, merge, heartScale = 6, color, dark = 0, basis = identityQuaternion, starBasis = basis }) {
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
      starBasisMatrix4.makeRotationFromQuaternion(starBasis);
      uniforms.uStarBasis.value.setFromMatrix4(starBasisMatrix4);
      right.set(1, 0, 0).applyQuaternion(starBasis);
      up.set(0, 1, 0).applyQuaternion(starBasis);
      forward.set(0, 0, 1).applyQuaternion(starBasis);
      configureCurve(origins[0], 1, uniforms.uAnchorA.value, uniforms.uControlAA.value, uniforms.uControlAB.value, heartScale);
      configureCurve(origins[1], -1, uniforms.uAnchorB.value, uniforms.uControlBA.value, uniforms.uControlBB.value, heartScale);
      particles.visible = (formation.available && p < .161) || (p > .637 && p < .991);
      stars.visible = p > .366 && p < .661;
      flash.visible = p > .638 && p < .690;
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
