import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import config from '../../config-v3.js';
import countries from '../../countries-v3.json';

// Isolated copy of V3's globe construction, spherical boundary subdivision,
// perspective camera and OrbitControls tuning. Production modules are not run.
const RADIUS = config.GLOBE_RADIUS;
const clamp = THREE.MathUtils.clamp;
const smoothstep = THREE.MathUtils.smoothstep;

export function latLonToVec3(lat, lon, radius = RADIUS) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export function overviewDistance(width = innerWidth, height = innerHeight) {
  return Math.max(60, 51 / (width / height));
}

function boundaryGeometry(rings) {
  const positions = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  const p = new THREE.Vector3(), q = new THREE.Vector3();
  const radius = RADIUS + .045;
  for (const ring of rings) {
    for (let i = 1; i < ring.length; i++) {
      a.copy(latLonToVec3(ring[i - 1][1], ring[i - 1][0], 1));
      b.copy(latLonToVec3(ring[i][1], ring[i][0], 1));
      const steps = Math.max(1, Math.ceil(a.angleTo(b) / .012));
      // Identical V3 great-circle segments: borders stay outside the sphere.
      for (let j = 0; j < steps; j++) {
        p.copy(a).lerp(b, j / steps).normalize().multiplyScalar(radius);
        q.copy(a).lerp(b, (j + 1) / steps).normalize().multiplyScalar(radius);
        positions.push(p.x, p.y, p.z, q.x, q.y, q.z);
      }
    }
  }
  return new THREE.BufferGeometry().setAttribute(
    'position', new THREE.Float32BufferAttribute(positions, 3),
  );
}

export async function createGlobe({ canvas, surface = canvas, onInteraction = () => {} }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, .1, 1000);
  camera.position.copy(latLonToVec3(30, 15, overviewDistance()));
  camera.lookAt(0, 0, 0);
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 768 ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight, false);
  const controls = new OrbitControls(camera, surface);
  controls.enabled = false;
  // OrbitControls sets touch-action:none on construction. Story scrolling owns
  // touch input until its final interactive globe takes over.
  surface.style.touchAction = 'pan-y';
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.zoomSpeed = 1;
  controls.minDistance = RADIUS * 1.25;
  controls.maxDistance = overviewDistance() * 1.3;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0;
  controls.dampingFactor = .05;
  controls.rotateSpeed = 1;
  const interaction = () => { if (controls.enabled) onInteraction(); };
  controls.addEventListener('start', interaction);

  const group = new THREE.Group();
  scene.add(group);
  const globeMaterial = new THREE.MeshBasicMaterial({ color: 0xf5f4f0 });
  const globeMesh = new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 128, 96), globeMaterial);
  group.add(globeMesh);
  const wireMaterial = new THREE.LineBasicMaterial({
    color: 0x8e918c, transparent: true, opacity: .08, depthWrite: false,
  });
  const netSource = new THREE.IcosahedronGeometry(RADIUS, 3);
  const netEdges = new THREE.WireframeGeometry(netSource);
  const netPositions = netEdges.attributes.position, netPoints = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), p = new THREE.Vector3();
  for (let edge = 0; edge < netPositions.count; edge += 2) {
    a.fromBufferAttribute(netPositions, edge);
    b.fromBufferAttribute(netPositions, edge + 1);
    for (let segment = 0; segment < 8; segment++) {
      for (const t of [segment / 8, (segment + 1) / 8]) {
        p.copy(a).lerp(b, t).normalize().multiplyScalar(RADIUS + .04);
        netPoints.push(p.x, p.y, p.z);
      }
    }
  }
  const netGeometry = new THREE.BufferGeometry().setAttribute(
    'position', new THREE.Float32BufferAttribute(netPoints, 3),
  );
  group.add(new THREE.LineSegments(netGeometry, wireMaterial));
  netEdges.dispose(); netSource.dispose();
  const overviewMaterial = new THREE.LineBasicMaterial({
    color: 0x64685f, transparent: true, opacity: .26, depthWrite: false,
  });
  group.add(new THREE.LineSegments(boundaryGeometry(countries), overviewMaterial));

  const detailLayers = [];
  let detailPromise, disposed = false, width = innerWidth, height = innerHeight;
  let theme = { paper: '#f5f4f0', ink: '#292a28', olive: false, dark: false };
  const paper = new THREE.Color(), ink = new THREE.Color();
  const markerColor = new THREE.Color();

  function setTheme(next) {
    theme = { ...theme, ...next };
    paper.set(theme.paper); ink.set(theme.ink);
    const n = Number(theme.dark), palette = Number(theme.olive);
    // Same linear-space colour treatment used in V3's applyGlobeTheme.
    globeMaterial.color.setRGB(.913 * (1 - n) + .014 * n, .905 * (1 - n) + .016 * n, .871 * (1 - n) + .014 * n).lerp(paper, palette);
    overviewMaterial.color.setRGB(.127 * (1 - n) + .68 * n, .138 * (1 - n) + .70 * n, .114 * (1 - n) + .64 * n).lerp(ink, palette);
    wireMaterial.color.setRGB(.27 * (1 - n) + .65 * n, .28 * (1 - n) + .67 * n, .26 * (1 - n) + .61 * n).lerp(ink, palette);
    markerColor.setRGB(.019 * (1 - n) + .84 * n, .02 * (1 - n) + .81 * n, .018 * (1 - n) + .72 * n).lerp(ink, palette);
    for (const layer of detailLayers) {
      layer.material.color.setRGB(.392 * (1 - n) + .69 * n, .408 * (1 - n) + .70 * n, .373 * (1 - n) + .65 * n).lerp(ink, palette);
    }
    renderer.setClearColor(paper, 1);
  }

  function ensureDetail() {
    if (detailPromise) return detailPromise;
    detailPromise = import('../../geography-detail-v3.json').then(({ default: data }) => {
      if (disposed) return;
      for (const feature of data.features) {
        const material = new THREE.LineBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
        const line = new THREE.LineSegments(boundaryGeometry(feature.rings), material);
        line.visible = false; group.add(line);
        detailLayers.push({ iso: feature.iso, line, material });
      }
      setTheme(theme);
    }).catch(() => { /* Existing overview boundaries remain a complete fallback. */ });
    return detailPromise;
  }

  function resize(nextWidth, nextHeight) {
    width = Math.max(1, nextWidth); height = Math.max(1, nextHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, width < 768 ? 1.5 : 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    controls.maxDistance = overviewDistance(width, height) * 1.3;
  }

  function setInteractive(enabled) {
    surface.style.touchAction = enabled ? 'none' : 'pan-y';
    if (controls.enabled === enabled) return;
    // Clear residual manual inertia before scroll once again owns the camera.
    const savedPosition = camera.position.clone(), savedQuaternion = camera.quaternion.clone();
    controls.enableDamping = false; controls.update();
    camera.position.copy(savedPosition); camera.quaternion.copy(savedQuaternion);
    controls.enableDamping = true; controls.enabled = enabled; controls.autoRotate = false;
  }

  function updateControls(dt = 1 / 60) {
    if (!controls.enabled) return;
    const near = controls.minDistance, far = controls.maxDistance;
    const distance = camera.position.distanceTo(controls.target);
    const zoom = clamp((distance - near) / Math.max(.001, far - near), 0, 1);
    const clearance = near - RADIUS + zoom * (far - near);
    const compensated = clamp(clearance / Math.max(.001, far - RADIUS), .025, 1);
    const target = Math.min(1, compensated * 1.3);
    controls.rotateSpeed += (target - controls.rotateSpeed) * (1 - Math.exp(-dt / .08));
    controls.update(dt);
  }

  const world = new THREE.Vector3(), projected = new THREE.Vector3();
  const normal = new THREE.Vector3(), direction = new THREE.Vector3();
  function projectSurface(position) {
    world.copy(position); group.localToWorld(world);
    normal.copy(world).normalize();
    direction.copy(camera.position).sub(world).normalize();
    const facing = normal.dot(direction);
    projected.copy(world).project(camera);
    return {
      x: (projected.x + 1) * width / 2,
      y: (1 - projected.y) * height / 2,
      facing,
      visible: facing > .025 && projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1.1 && Math.abs(projected.y) < 1.1,
    };
  }

  function render() {
    camera.updateMatrixWorld(); group.updateMatrixWorld(true);
    const detail = smoothstep((36 - camera.position.length()) / 18, 0, 1);
    if (detail > 0 && !detailPromise) ensureDetail();
    const mix = detailLayers.length ? detail : 0;
    overviewMaterial.opacity = .26 * (1 - mix * .86);
    wireMaterial.opacity = .08 * (1 - detail * .94);
    for (const layer of detailLayers) {
      layer.material.opacity = detail * .19;
      layer.line.visible = layer.material.opacity > .002;
    }
    renderer.render(scene, camera);
  }

  function dispose() {
    disposed = true; controls.removeEventListener('start', interaction); controls.dispose();
    group.traverse(object => {
      object.geometry?.dispose();
      const materials = object.material ? [object.material].flat() : [];
      for (const material of materials) material.dispose();
    });
    renderer.dispose();
  }

  setTheme(theme);
  return {
    THREE, scene, camera, renderer, controls, group, radius: RADIUS,
    globeMesh, globeMaterial, overviewMaterial, wireMaterial, markerColor,
    latLonToVec3, overviewDistance, boundaryGeometry, ensureDetail,
    setTheme, resize, render, dispose, setInteractive, updateControls, projectSurface,
  };
}
