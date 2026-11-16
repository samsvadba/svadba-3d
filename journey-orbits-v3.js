const PLANETS = [
  { body: .085, orbit: 7.7, heading: -.23, tilt: .22, phase: .27, speed: .031, opacity: .114, ring: true },
  { body: .056, orbit: 5.8, heading: -.46, tilt: .67, phase: -.43, speed: .047, opacity: .098 },
  { body: .037, orbit: 4.6, heading: .27, tilt: .39, phase: .38, speed: .067, opacity: .084 },
  { body: .031, orbit: 9.7, heading: .66, tilt: -.09, phase: -.54, speed: .023, opacity: .078, desktop: true },
  { body: .046, orbit: 6.7, heading: -1.02, tilt: .32, phase: .77, speed: .054, opacity: .088, desktop: true },
];
const MOBILE_STARS = 96;
const DESKTOP_STARS = 192;

export function createJourneyOrbits(THREE, scene, globeRadius) {
  const group = new THREE.Group();
  group.name = 'Journey orbits';
  group.visible = false;
  scene.add(group);

  const sphere = new THREE.SphereGeometry(1, 11, 8);
  const ringMaterial = new THREE.MeshBasicMaterial({
    wireframe: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.55, 2.48, 30), ringMaterial);
  const planets = PLANETS.map(definition => {
    // Each orbit is a tilted plane in world space. Turning the globe also
    // changes the view of the planets, including the angle of the ring.
    const x = Math.cos(definition.heading), z = Math.sin(definition.heading);
    const tilt = Math.cos(definition.tilt);
    const away = new THREE.Vector3(-x * tilt, -Math.sin(definition.tilt), -z * tilt);
    const across = new THREE.Vector3(-z, 0, x);
    const material = new THREE.MeshBasicMaterial({wireframe: true, transparent: true, depthWrite: false});
    const mesh = new THREE.Mesh(sphere, material);
    mesh.scale.setScalar(globeRadius * definition.body);
    if (definition.ring) {
      const normal = new THREE.Vector3().crossVectors(away, across);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
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
    point.scale.setScalar(globeRadius * (.0033 + (i * .41421356 % 1) * .0038));
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
      const globeProjection = Math.sqrt(distance * distance - globeRadius * globeRadius) / globeRadius;
      towardCamera.copy(camera.position).normalize();
      for (const {definition, away, across, mesh, material} of planets) {
        const {desktop, phase, speed, orbit, ring: isRinged} = definition;
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
        material.color.copy(theme.ink).lerp(theme.paper, .31);
        material.opacity = fade * (definition.opacity + .050 * night);
        if (isRinged) {
          ringMaterial.color.copy(material.color).lerp(theme.paper, .14);
          ringMaterial.opacity = fade * (.074 + .045 * night);
        }
      }
      stars.count = mobile ? MOBILE_STARS : DESKTOP_STARS;
      stars.rotation.y = orbitTime * .006;
      starMaterial.color.copy(theme.ink).lerp(theme.paper, .22);
      starMaterial.opacity = opacity * (.265 + .065 * night);
    },
    hide() { group.visible = false; },
  };
}
