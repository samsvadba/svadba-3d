const PLANETS = [
  { body: .095, orbit: 7.7, heading: -.23, tilt: .22, phase: .27, speed: .031, opacity: .40, saturn: true },
  { body: .060, orbit: 5.8, heading: -.46, tilt: .67, phase: -.43, speed: .047, opacity: .255 },
  { body: .037, orbit: 4.6, heading: .27, tilt: .39, phase: .38, speed: .067, opacity: .22 },
  { body: .049, orbit: 7.1, heading: .31, tilt: 1.08, phase: .64, speed: .038, opacity: .25 },
  { body: .030, orbit: 5.1, heading: -.10, tilt: -.47, phase: .44, speed: .058, opacity: .20 },
  { body: .031, orbit: 9.7, heading: .66, tilt: -.09, phase: -.54, speed: .023, opacity: .20, desktop: true },
  { body: .046, orbit: 6.7, heading: -1.02, tilt: .32, phase: .77, speed: .054, opacity: .24, desktop: true },
  { body: .055, orbit: 8.6, heading: -.38, tilt: .85, phase: -.48, speed: .027, opacity: .23, desktop: true },
];
const MOBILE_STARS = 420;
const DESKTOP_STARS = MOBILE_STARS * 2;

const planetVertex = `
  varying vec3 vNormal;
  varying float vLatitude;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vLatitude = position.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const planetFragment = `
  uniform vec3 uInk;
  uniform vec3 uPaper;
  uniform float uNight;
  uniform float uOpacity;
  uniform float uBands;
  varying vec3 vNormal;
  varying float vLatitude;
  void main() {
    vec3 n = normalize(vNormal);
    float sunlight = max(dot(n, vec3(-0.58, 0.53, 0.62)), 0.0);
    float haze = 0.55 * sin(vLatitude * 16.0) + 0.30 * sin(vLatitude * 34.0 + 1.6);
    float bands = haze * uBands * smoothstep(0.0, 0.6, n.z);
    float pigment = mix(0.86 - 0.57 * sunlight, 0.11 + 0.80 * sunlight, uNight) + bands;
    gl_FragColor = vec4(mix(uPaper, uInk, clamp(pigment, 0.0, 1.0)), uOpacity);
    #include <colorspace_fragment>
  }
`;

const ringVertex = `
  varying vec2 vRing;
  void main() {
    vRing = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ringFragment = `
  uniform vec3 uInk;
  uniform vec3 uPaper;
  uniform float uOpacity;
  varying vec2 vRing;
  void main() {
    float radius = length(vRing);
    float inner = smoothstep(1.20, 1.39, radius) * (1.0 - smoothstep(1.89, 1.96, radius));
    float outer = smoothstep(2.03, 2.08, radius) * (1.0 - smoothstep(2.50, 2.62, radius));
    float grain = 0.89 + 0.075 * sin(radius * 83.0) + 0.035 * sin(radius * 151.0);
    float opacity = max(inner, 0.67 * outer) * grain;
    if (opacity < 0.01) discard;
    vec3 tint = mix(uPaper, uInk, 0.69 - 0.11 * vRing.x / radius);
    gl_FragColor = vec4(tint, opacity * uOpacity);
    #include <colorspace_fragment>
  }
`;

export function createJourneyOrbits(THREE, scene, globeRadius) {
  const group = new THREE.Group();
  group.name = 'Journey orbits';
  group.visible = false;
  scene.add(group);

  const sphere = new THREE.SphereGeometry(1, 24, 16);
  const lighting = {uInk:{value:new THREE.Color()}, uPaper:{value:new THREE.Color()}, uNight:{value:0}};
  const ringMaterial = new THREE.ShaderMaterial({
    vertexShader:ringVertex, fragmentShader:ringFragment,
    uniforms:{...lighting,uOpacity:{value:0}},
    transparent:true, depthWrite:false, side:THREE.DoubleSide, forceSinglePass:true,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.20, 2.62, 80), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 1;
  const up = new THREE.Vector3(0, 1, 0);
  const planets = PLANETS.map(definition => {
    // Each orbit is a tilted plane in world space. Turning the globe also
    // changes the view of the planets, including the angle of the ring.
    const x = Math.cos(definition.heading), z = Math.sin(definition.heading);
    const tilt = Math.cos(definition.tilt);
    const away = new THREE.Vector3(-x * tilt, -Math.sin(definition.tilt), -z * tilt);
    const across = new THREE.Vector3(-z, 0, x);
    const material = new THREE.ShaderMaterial({
      vertexShader:planetVertex, fragmentShader:planetFragment,
      uniforms:{...lighting,uOpacity:{value:0},uBands:{value:definition.saturn ? .12 : .025}},
      transparent:true,
      // Saturn's body occludes the far side of its ring.
      depthWrite:!!definition.saturn,
    });
    const mesh = new THREE.Mesh(sphere, material);
    mesh.scale.setScalar(globeRadius * definition.body);
    if (definition.saturn) {
      const normal = new THREE.Vector3().crossVectors(away, across);
      mesh.quaternion.setFromUnitVectors(up, normal);
      mesh.add(ring);
    }
    group.add(mesh);
    return {definition, away, across, mesh, material};
  });

  const starMaterial = new THREE.MeshBasicMaterial({transparent: true, depthWrite: false});
  const stars = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), starMaterial, DESKTOP_STARS);
  const point = new THREE.Object3D();
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < DESKTOP_STARS; i++) {
    // Both halves cover the whole shell, so reducing instance count on mobile
    // keeps dots distributed on both sides of the screen.
    const y = 1 - 2 * ((i % MOBILE_STARS) + .5) / MOBILE_STARS;
    const azimuth = i * goldenAngle;
    const radius = globeRadius * (4.45 + (i * .61803398875 % 1) * 4.3);
    const horizontal = Math.sqrt(1 - y * y);
    point.position.set(horizontal * Math.cos(azimuth), y, horizontal * Math.sin(azimuth)).multiplyScalar(radius);
    const size = i * .41421356 % 1;
    point.scale.setScalar(globeRadius * (.0031 + size * size * .0054));
    point.updateMatrix();
    stars.setMatrixAt(i, point.matrix);
  }
  stars.instanceMatrix.needsUpdate = true;
  stars.computeBoundingSphere();
  group.add(stars);

  const towardCamera = new THREE.Vector3();
  const { smoothstep } = THREE.MathUtils;
  let orbitTime = 0;

  return {
    update({camera, distance, overviewDistance, dt = 0, theme, reducedMotion = false, visible = true}) {
      const opacity = visible ? smoothstep(distance / overviewDistance, .62, .94) : 0;
      group.visible = opacity > .002;
      if (!group.visible) return;
      if (!reducedMotion) orbitTime += dt;

      const mobile = camera.view ? camera.view.fullWidth < 768 : camera.aspect < .85;
      const night = theme.dark ?? 0;
      lighting.uInk.value.copy(theme.ink);
      lighting.uPaper.value.copy(theme.paper);
      lighting.uNight.value=night;
      const globeProjection = Math.sqrt(distance * distance - globeRadius * globeRadius) / globeRadius;
      towardCamera.copy(camera.position).normalize();
      for (const {definition, away, across, mesh, material} of planets) {
        const {desktop, phase, speed, orbit, saturn} = definition;
        if (desktop && mobile) { mesh.visible = false; continue; }
        const angle = phase + orbitTime * speed;
        const radius = globeRadius * orbit;
        mesh.position.copy(away).multiplyScalar(Math.cos(angle) * radius)
          .addScaledVector(across, Math.sin(angle) * radius);
        const depth = mesh.position.dot(towardCamera);
        const projectedOffset = Math.sqrt(Math.max(0, radius * radius - depth * depth))
          * globeProjection / Math.max(1, distance - depth);
        const fade = opacity * smoothstep(projectedOffset, 1.06, 1.33)
          * smoothstep(distance - depth, globeRadius, globeRadius * 2.8);
        mesh.visible = fade > .002;
        material.uniforms.uOpacity.value = fade * (definition.opacity + .065 * night);
        if (saturn) ringMaterial.uniforms.uOpacity.value = fade * (.34 + .085 * night);
      }
      stars.count = mobile ? MOBILE_STARS : DESKTOP_STARS;
      stars.rotation.y = orbitTime * .006;
      starMaterial.color.copy(theme.ink).lerp(theme.paper, .22);
      starMaterial.opacity = opacity * (.265 + .065 * night);
    },
    hide() { group.visible = false; },
  };
}
