// One native WebGL scene, one reversible pose and one finite transition clock.
// The destination is sampled from the real invitation, not a second design.
export function createWeddingParticles({
  THREE, gsap, scene, camera, renderer, controls, globeGroup, globeMesh,
  overviewGeometry, framing, radius = 12, overviewDistance, getTheme,
  onReveal = () => {}, onFinish = () => {}, count = innerWidth < 768 ? 22000 : 30000,
}) {
  const clamp = THREE.MathUtils.clamp;
  const smooth = (a, b, p) => THREE.MathUtils.smoothstep(p, a, b);
  const clock = { progress: 0 };
  let active = false, tween, snapshot, width = 0, height = 0, lastReveal = -1;
  const suspensions = new Set();
  const yAxis = new THREE.Vector3(0, 1, 0), spin = new THREE.Quaternion();
  const endPosition = new THREE.Vector3(), clearColor = new THREE.Color();
  const positions = new Float32Array(count * 3), scatter = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 3);
  let seed = 0x534d2027;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const borders = overviewGeometry.getAttribute('position');
  if (!borders || borders.count < 2) throw new Error('The existing globe boundaries are required.');
  const a = new THREE.Vector3(), b = new THREE.Vector3(), point = new THREE.Vector3();
  const lengths = [], edges = Math.floor(borders.count / 2);
  let total = 0;
  for (let edge = 0; edge < edges; edge++) {
    a.fromBufferAttribute(borders, edge * 2); b.fromBufferAttribute(borders, edge * 2 + 1);
    total += a.distanceTo(b); lengths.push(total);
  }
  for (let index = 0, edge = 0; index < count; index++) {
    const distance = (index + random()) / count * total;
    while (edge < edges - 1 && lengths[edge] < distance) edge++;
    a.fromBufferAttribute(borders, edge * 2); b.fromBufferAttribute(borders, edge * 2 + 1);
    point.copy(a).lerp(b, random()).normalize().multiplyScalar(radius + .055);
    point.toArray(positions, index * 3);
    const azimuth = random() * Math.PI * 2, vertical = random() * 2 - 1;
    const radial = Math.sqrt(1 - vertical * vertical), reach = radius * (.8 + random() * 1.6);
    scatter.set([Math.cos(azimuth) * radial * reach, vertical * reach, Math.sin(azimuth) * radial * reach], index * 3);
    seeds.set([random(), random(), random()], index * 3);
  }
  // Shuffle geographic sources as well as invitation targets, avoiding ribbons
  // that would sweep through countries in their JSON order.
  for (let index = count - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    for (let axis = 0; axis < 3; axis++) {
      const value = positions[index * 3 + axis];
      positions[index * 3 + axis] = positions[other * 3 + axis];
      positions[other * 3 + axis] = value;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
  geometry.setAttribute('aTarget', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const uniforms = {
    uProgress: { value: 0 }, uInk: { value: new THREE.Color() }, uPaper: { value: new THREE.Color() },
    uGlobe: { value: new THREE.Matrix4() }, uCameraWorld: { value: new THREE.Matrix4() },
    uInverseProjection: { value: new THREE.Matrix4() }, uPixelRatio: { value: 1 },
    uTargetDepth: { value: radius * 3 }, uDark: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, depthTest: false,
    vertexShader: `
      attribute vec3 aScatter, aSeed, aTarget;
      uniform float uProgress, uPixelRatio, uTargetDepth;
      uniform mat4 uGlobe, uCameraWorld, uInverseProjection;
      varying float vAlpha, vHalo;
      void main() {
        float p = uProgress;
        float burst = smoothstep(.30, .65, p);
        float gather = smoothstep(.49 + aSeed.x * .055, .90 + aSeed.y * .025, p);
        vec3 source = (uGlobe * vec4(position, 1.)).xyz;
        vec3 normal = normalize((uGlobe * vec4(normalize(position), 0.)).xyz);
        float facing = dot(normal, normalize(cameraPosition - source));
        float front = mix(smoothstep(-.10, .10, facing), 1., smoothstep(.30, .52, p));
        vec3 cloud = source * (1. + burst * .33) + aScatter * burst;
        float arc = sin(burst * 3.14159265) * (1. - gather);
        cloud += (uCameraWorld * vec4(sin(aSeed.z * 6.283 + p * 5.) * arc * 4., cos(aSeed.y * 6.283 + p * 4.) * arc * 3., 0., 0.)).xyz;
        vec4 eye = uInverseProjection * vec4(aTarget.xy, 0., 1.);
        vec3 targetEye = eye.xyz / eye.w;
        targetEye *= uTargetDepth / -targetEye.z;
        vec3 target = (uCameraWorld * vec4(targetEye, 1.)).xyz;
        vec3 world = mix(cloud, target, gather);
        vec4 view = viewMatrix * vec4(world, 1.);
        gl_Position = projectionMatrix * view;
        float flySize = mix(1.1, 2.25, aSeed.z) * (1. + sin(burst * 3.14159265) * .25);
        gl_PointSize = uPixelRatio * mix(flySize, 1.25, gather);
        vAlpha = smoothstep(.12, .32, p) * (1. - smoothstep(.91, 1., p)) * front;
        vAlpha *= mix(.50 + aSeed.y * .48, .93, gather);
        vHalo = (1. - gather) * aSeed.z;
      }
    `,
    fragmentShader: `
      uniform vec3 uInk;
      uniform float uDark;
      varying float vAlpha, vHalo;
      void main() {
        float r = length(gl_PointCoord - .5) * 2.;
        float core = 1. - smoothstep(.28, 1., r);
        float alpha = core * vAlpha;
        if (alpha < .008) discard;
        gl_FragColor = vec4(uInk * (1. + uDark * vHalo * .16), alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'wedding-invitation-particles'; points.frustumCulled = false;
  points.visible = false; points.renderOrder = 5; scene.add(points);

  function setTargets(targets) {
    if (!(targets instanceof Float32Array) || targets.length !== count * 3 || !targets.every(Number.isFinite)) {
      throw new TypeError('Invitation targets must match the particle count.');
    }
    geometry.getAttribute('aTarget').array.set(targets);
    geometry.getAttribute('aTarget').needsUpdate = true;
  }
  function remember() {
    const objects = [], materials = new Map();
    globeGroup.traverse(object => {
      objects.push([object, object.visible]);
      for (const mat of object.material ? Array.isArray(object.material) ? object.material : [object.material] : []) {
        if (!materials.has(mat)) materials.set(mat, { opacity: mat.opacity, transparent: mat.transparent, depthWrite: mat.depthWrite });
      }
    });
    snapshot = {
      position: camera.position.clone(), quaternion: camera.quaternion.clone(), up: camera.up.clone(),
      target: controls.target.clone(), view: camera.view ? { ...camera.view } : null,
      enabled: controls.enabled, autoRotate: controls.autoRotate,
      globe: globeGroup.quaternion.clone(), framing: { ...framing }, objects, materials,
      clear: renderer.getClearColor?.(clearColor).clone(), alpha: renderer.getClearAlpha?.() ?? 0,
    };
  }
  function restore() {
    if (!snapshot) return;
    camera.position.copy(snapshot.position); camera.quaternion.copy(snapshot.quaternion); camera.up.copy(snapshot.up);
    camera.view = snapshot.view ? { ...snapshot.view } : null; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    controls.target.copy(snapshot.target); controls.enabled = snapshot.enabled; controls.autoRotate = snapshot.autoRotate;
    Object.assign(framing, snapshot.framing); globeGroup.quaternion.copy(snapshot.globe);
    for (const [object, visible] of snapshot.objects) object.visible = visible;
    for (const [mat, values] of snapshot.materials) { Object.assign(mat, values); mat.needsUpdate = true; }
    if (snapshot.clear) renderer.setClearColor(snapshot.clear, snapshot.alpha);
    else renderer.setClearColor(0x000000, snapshot.alpha);
    globeGroup.updateMatrixWorld(true); snapshot = null;
  }
  function render(nextWidth, nextHeight) {
    if (!active) return;
    width = Math.max(1, nextWidth); height = Math.max(1, nextHeight);
    const p = clock.progress, pullback = smooth(0, .22, p);
    endPosition.copy(snapshot.position).sub(snapshot.target).normalize().multiplyScalar(overviewDistance(width, height) * 1.02);
    camera.position.copy(snapshot.position).lerp(endPosition, pullback);
    controls.target.copy(snapshot.target).multiplyScalar(1 - pullback);
    camera.lookAt(controls.target);
    if (snapshot.view?.enabled) {
      camera.setViewOffset(width, height, snapshot.view.offsetX / snapshot.view.fullWidth * width * (1 - pullback), snapshot.view.offsetY / snapshot.view.fullHeight * height * (1 - pullback), width, height);
    } else camera.clearViewOffset();
    framing.x = snapshot.framing.x * (1 - pullback); framing.y = snapshot.framing.y * (1 - pullback);
    camera.updateMatrixWorld(true);
    // A single accelerating turn, then the geographic ink flies apart.
    const rotation = smooth(0, .53, p) * Math.PI * 2 * 1.45;
    spin.setFromAxisAngle(yAxis, rotation);
    globeGroup.quaternion.copy(snapshot.globe).premultiply(spin);
    const fade = 1 - smooth(.25, .44, p);
    for (const [mat, values] of snapshot.materials) {
      mat.opacity = values.opacity * fade;
    }
    // New geographic detail may finish loading during this finite transition.
    // Keep it hidden too; it will be styled normally on the next Journey frame.
    globeGroup.traverse(object => { if (object.material && !snapshot.materials.has(object.material)) object.visible = false; });
    globeGroup.updateMatrixWorld(true);
    const theme = getTheme();
    uniforms.uProgress.value = p; uniforms.uInk.value.copy(theme.ink); uniforms.uPaper.value.copy(theme.paper);
    uniforms.uDark.value = theme.dark;
    uniforms.uPixelRatio.value = renderer.getPixelRatio?.() ?? 1;
    uniforms.uGlobe.value.copy(globeGroup.matrixWorld);
    uniforms.uCameraWorld.value.copy(camera.matrixWorld);
    uniforms.uInverseProjection.value.copy(camera.projectionMatrixInverse);
    renderer.setClearColor(theme.paper, 1);
    const reveal = smooth(.91, 1, p);
    if (reveal !== lastReveal) { lastReveal = reveal; onReveal(reveal); }
    renderer.render(scene, camera);
  }
  function leave() {
    if (!active) return;
    active = false; tween?.kill(); tween = null; suspensions.clear(); points.visible = false;
    restore();
  }
  function finish() {
    if (!active) return;
    clock.progress = 1; render(width || innerWidth, height || innerHeight);
    leave(); onFinish();
  }
  return {
    get active() { return active; },
    start(targets) {
      leave(); setTargets(targets); remember(); active = true; clock.progress = 0; lastReveal = -1;
      controls.enabled = false; controls.autoRotate = false;
      for(const [mat] of snapshot.materials){
        // Three compiles OPAQUE into an opaque material's shader. Recompile
        // once here so the existing solid globe can genuinely fade away.
        if(!mat.transparent){mat.transparent=true;mat.needsUpdate=true;}
        mat.depthWrite=false;
      }
      // City dots and origin badges disappear with the HTML city labels.
      globeGroup.traverse(object => { if (object.isMesh && object !== globeMesh) object.visible = false; });
      points.visible = true; render(innerWidth, innerHeight);
      tween = gsap.to(clock, { progress: 1, duration: 6.4, ease: 'none', onComplete: finish });
      if (suspensions.size || document.hidden) { suspensions.add('visibility'); tween.pause(); }
    },
    render, setTargets,
    seek(p) { if (!active) return; const progress=clamp(p,0,1);tween?.progress(progress,true).pause();clock.progress=progress;render(width || innerWidth, height || innerHeight); },
    suspend(reason) { suspensions.add(reason); tween?.pause(); },
    resume(reason) { suspensions.delete(reason); if (active && !suspensions.size && !document.hidden) tween?.resume(); },
    finish, leave,
    dispose() { leave(); scene.remove(points); geometry.dispose(); material.dispose(); },
  };
}
