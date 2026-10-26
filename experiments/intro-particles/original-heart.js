// Restored verbatim from 2f7b1ed75ab0cf6f43b0062870c23631586fdc8f.
// The first prototype's implicit shell/interior sampler and point sprite.
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

export {heartField,heartPoint};
export const originalPointFragment = /* glsl */ `
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
