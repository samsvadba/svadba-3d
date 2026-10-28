import * as THREE from 'three';

// One film score for autoplay and reversible manual scrubbing. Phases include
// a brief hold over the home towns before the camera follows the stars. The two
// stars' single collision reforms directly into Earth, also when scrubbed back.
export const STORY_PHASES = Object.freeze({
  formation: Object.freeze([0, .144]),
  overview: Object.freeze([.144, .18]),
  approach: Object.freeze([.18, .30]),
  origins: Object.freeze([.30, .39]),
  stars: Object.freeze([.37, .64]),
  retreat: Object.freeze([.39, .65]),
  burst: Object.freeze([.64, .72]),
  reform: Object.freeze([.70, .995]),
  final: Object.freeze([.995, 1]),
});

const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, value) => THREE.MathUtils.smoothstep(value, a, b);
const smoother = (a, b, value) => THREE.MathUtils.smootherstep(value, a, b);
const DEFAULT_HEART_BOUNDS = Object.freeze({ width: 2.08, height: 2.24, depth: 1.24 });

/**
 * Create once. sample() allocates no vectors, quaternions or arrays per frame.
 * Its result is reused: callers copy its position/target, rather than mutate it.
 */
export function createChoreography({ homeDirection, startDirection, radius = 12 }) {
  const home = homeDirection.clone().normalize();
  const start = startDirection.clone().normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const fixedBasis = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(home, new THREE.Vector3(), up),
  );
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(fixedBasis);
  const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(fixedBasis);
  const orientRotation = new THREE.Quaternion().setFromUnitVectors(start, home);
  const identity = new THREE.Quaternion(), rotation = new THREE.Quaternion();
  const direction = new THREE.Vector3();
  const pose = {
    progress: 0,
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    basis: fixedBasis,
    merge: home.clone().multiplyScalar(radius + 8),
    heartScale: 1,
    cameraRadius: 60,
    globeOpacity: 0,
    geographyOpacity: 0,
    globeReveal: 0,
    formationProgress: 0,
    formationRotation: 0,
    originReveal: 0,
    originFocus: 0,
    finalReveal: 0,
    travel: 0,
  };

  function sample(progress, {
    width = innerWidth,
    height = innerHeight,
    overviewDistance,
    heartBounds = DEFAULT_HEART_BOUNDS,
  } = {}) {
    const p = clamp(progress, 0, 1);
    const aspect = Math.max(.01, width / height);
    const overview = typeof overviewDistance === 'function'
      ? overviewDistance(width, height)
      : Number.isFinite(overviewDistance) ? overviewDistance : Math.max(60, 51 / aspect);
    const nearRadius = radius + 4.2;
    const farRadius = overview * 1.32;
    const approach = smoother(.18, .30, p);
    const retreat = smoother(.39, .65, p);
    const returnToOverview = smoother(.70, 1, p);
    const formationSettle = smoother(0, .144, p);

    // All orientation changes are spherical rotations outside the Earth.
    rotation.copy(identity).slerp(orientRotation, smoother(.18, .285, p));
    direction.copy(start).applyQuaternion(rotation);
    // A restrained three-quarter parallax during flight, back on the same
    // home-facing axis before the stars meet. No changing particle coordinate frame.
    const arc = Math.sin(Math.PI * retreat);
    direction.addScaledVector(right, .045 * arc)
      .addScaledVector(cameraUp, .018 * Math.sin(2 * Math.PI * retreat)).normalize();
    const entryRadius = THREE.MathUtils.lerp(overview * 1.06, overview, formationSettle);
    const focusedRadius = THREE.MathUtils.lerp(entryRadius, nearRadius, approach);
    const travellingRadius = THREE.MathUtils.lerp(focusedRadius, farRadius, retreat);
    const cameraRadius = THREE.MathUtils.lerp(travellingRadius, overview, returnToOverview);
    pose.position.copy(direction).multiplyScalar(Math.max(radius + 2.5, cameraRadius));
    pose.target.copy(home).multiplyScalar(radius * approach * (1 - retreat));

    // The merge point and its cloud have a fixed, physically meaningful position
    // above the globe. Framing derives from the actual 45-degree perspective.
    const effectDepth = Math.max(radius, farRadius - (radius + 8));
    const worldHeight = 2 * effectDepth * Math.tan(Math.PI / 8);
    const horizontalScale = worldHeight * aspect * .78 / heartBounds.width;
    const verticalScale = worldHeight * (height < 560 ? .46 : .55) / heartBounds.height;
    pose.heartScale = Math.min(horizontalScale, verticalScale);

    const globeReveal = smooth(.08, .144, p);
    // Briefly subdue the existing globe after the stars strike. Its geography
    // returns beneath these same particles as they settle into Earth.
    const cloudPresence = smooth(.64, .70, p) * (1 - smooth(.82, .995, p));
    pose.progress = p;
    pose.cameraRadius = cameraRadius;
    pose.globeReveal = globeReveal;
    pose.globeOpacity = globeReveal * (1 - .90 * cloudPresence);
    pose.geographyOpacity = globeReveal * (1 - .94 * cloudPresence);
    pose.formationProgress = smooth(0, .144, p);
    // One shared motion from the first cloud to the completed globe. Gathering
    // finishes after four seconds, with the final second gently coasting to rest.
    // The same angle drives cloud and geography, so neither jumps at handoff.
    const spin = smoother(0, .18, p);
    pose.formationRotation = -Math.PI * 4 * (1 - spin);
    pose.originReveal = smooth(.275, .30, p) * (1 - smooth(.39, .45, p));
    pose.originFocus = smooth(.21, .29, p) * (1 - smooth(.43, .50, p));
    pose.finalReveal = smooth(.995, 1, p);
    pose.travel = smooth(.37, .64, p);
    return pose;
  }

  return { sample, phases: STORY_PHASES };
}
