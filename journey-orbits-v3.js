export function createJourneyOrbits(THREE, scene, globeRadius) {
  const group = new THREE.Group();
  group.name = 'Journey orbits';
  group.visible = false;
  scene.add(group);

  const planetRadius = globeRadius * .043;
  const planetMaterial = new THREE.MeshBasicMaterial({transparent:true, depthWrite:false});
  const ringMaterial = new THREE.MeshBasicMaterial({transparent:true, depthWrite:false, side:THREE.DoubleSide});
  const moonMaterial = new THREE.MeshBasicMaterial({transparent:true, depthWrite:false});
  const moteMaterial = new THREE.MeshBasicMaterial({transparent:true, depthWrite:false});
  const planet = new THREE.Group();
  const sphere = new THREE.SphereGeometry(1, 16, 10);
  const body = new THREE.Mesh(sphere, planetMaterial);
  body.scale.setScalar(planetRadius);
  const ring = new THREE.Mesh(new THREE.RingGeometry(planetRadius * 1.18, planetRadius * 1.91, 48), ringMaterial);
  ring.rotation.set(1.17, 0, .18, 'ZYX');
  planet.add(body, ring);
  const moon = new THREE.Mesh(sphere, moonMaterial);
  moon.scale.setScalar(globeRadius * .019);
  group.add(planet, moon);

  // Keep the stars in 3D and use a single draw call for all the little points.
  const moteCount = 42;
  const motes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), moteMaterial, moteCount);
  const point = new THREE.Object3D();
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < moteCount; i++) {
    const y = 1 - 2 * (i + .5) / moteCount;
    const azimuth = i * goldenAngle;
    const radius = globeRadius * (1.75 + (i * .61803398875 % 1) * 1.95);
    const horizontal = Math.sqrt(1 - y * y);
    point.position.set(horizontal * Math.cos(azimuth), y, horizontal * Math.sin(azimuth)).multiplyScalar(radius);
    point.scale.setScalar(globeRadius * (.0032 + (i * .41421356 % 1) * .004));
    point.updateMatrix();
    motes.setMatrixAt(i, point.matrix);
  }
  motes.instanceMatrix.needsUpdate = true;
  motes.computeBoundingSphere();
  group.add(motes);

  // Incline the orbits in world space so the camera sees their depth as it turns.
  function orbit(longitude, tilt) {
    const x = Math.cos(longitude), z = Math.sin(longitude);
    const bank = Math.sin(tilt);
    return {
      across: new THREE.Vector3(-z, 0, x),
      up: new THREE.Vector3(-x * bank, Math.cos(tilt), -z * bank),
    };
  }
  const planetOrbit = orbit(-Math.PI / 12, .44);
  const moonOrbit = orbit(Math.PI / 5, .12);
  const towardCamera = new THREE.Vector3();
  const { smoothstep } = THREE.MathUtils;
  let orbitTime = 0;

  function place(position, plane, angle, radius) {
    position.copy(plane.across).multiplyScalar(Math.cos(angle) * radius)
      .addScaledVector(plane.up, Math.sin(angle) * radius);
  }

  function clearance(position, distance) {
    const depth = position.dot(towardCamera);
    const side = Math.sqrt(Math.max(0, position.lengthSq() - depth * depth));
    const projectedRadii = side * Math.sqrt(distance * distance - globeRadius * globeRadius)
      / ((distance - depth) * globeRadius);
    return smoothstep(projectedRadii, 1.10, 1.28);
  }

  return {
    update({camera, distance, overviewDistance, dt = 0, theme, reducedMotion = false, visible = true}) {
      const opacity = visible ? smoothstep(distance / overviewDistance, .62, .94) : 0;
      group.visible = opacity > .002;
      if (!group.visible) return;
      if (!reducedMotion) orbitTime += dt;

      place(planet.position, planetOrbit, 2.02 - orbitTime * .15, globeRadius * 1.79);
      place(moon.position, moonOrbit, -1.17 + orbitTime * .092, globeRadius * 1.43);
      planet.quaternion.copy(camera.quaternion);
      motes.rotation.y = orbitTime * .014;
      towardCamera.copy(camera.position).normalize();

      const planetFade = opacity * clearance(planet.position, distance);
      const moonFade = opacity * clearance(moon.position, distance);
      planet.visible = planetFade > .002;
      moon.visible = moonFade > .002;
      const night = theme.dark ?? 0;
      planetMaterial.color.copy(theme.ink);
      ringMaterial.color.copy(theme.ink);
      moonMaterial.color.copy(theme.ink);
      moteMaterial.color.copy(theme.ink);
      planetMaterial.opacity = planetFade * (.21 + .07 * night);
      ringMaterial.opacity = planetFade * (.25 + .08 * night);
      moonMaterial.opacity = moonFade * (.20 + .06 * night);
      moteMaterial.opacity = opacity * (.17 + .06 * night);
    },
    hide() { group.visible = false; },
  };
}
