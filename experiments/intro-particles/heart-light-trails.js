import * as THREE from 'three';
import { originalPointFragment } from './original-heart.js';

// A closed, arc-length sampled version of the native globe heart badge.
// One cached contour drives both the luminous pen and the revealed ribbon.
export const HEART_TRACE_SEGMENTS = 156;
const point = (x, y) => new THREE.Vector3((x - 12) / 9, (12 - y) / 9, 0);
const curve = new THREE.CurvePath();
for (const c of [
  [12,20,12,20,3,14.5,3,8.5], [3,8.5,3,3.8,9,2.8,12,7],
  [12,7,15,2.8,21,3.2,21,8.5], [21,8.5,21,14.5,12,20,12,20],
]) curve.add(new THREE.CubicBezierCurve3(point(c[0],c[1]),point(c[2],c[3]),point(c[4],c[5]),point(c[6],c[7])));
const contour = Array.from({length:HEART_TRACE_SEGMENTS + 1}, (_, i) => curve.getPointAt(i / HEART_TRACE_SEGMENTS));
contour[HEART_TRACE_SEGMENTS].copy(contour[0]);

export function sampleHeartContour(value, target) {
  const position = THREE.MathUtils.clamp(value, 0, 1) * HEART_TRACE_SEGMENTS;
  const index = Math.min(HEART_TRACE_SEGMENTS - 1, Math.floor(position));
  return target.copy(contour[index]).lerp(contour[index + 1], position - index);
}

export function sampleHeartTrace(progress, target) {
  const p = THREE.MathUtils.clamp(progress, 0, 1);
  target.reveal = THREE.MathUtils.smoothstep(p, .735, .795);
  target.coreAlpha = THREE.MathUtils.smoothstep(p, .685, .704)
    * (1 - THREE.MathUtils.smoothstep(p, .795, .803));
  target.tipWeight = THREE.MathUtils.smoothstep(p, .710, .735);
  sampleHeartContour(target.reveal, target.tip);
  return target;
}

const common = /* glsl */ `
  uniform float uProgress;
  uniform float uScale;
  uniform float uPixelRatio;
  uniform float uMarkerScale;
  uniform mat3 uBasis;
  uniform vec3 uMerge;
  uniform vec3 uHeartCenterA;
  uniform vec3 uHeartCenterB;
  uniform float uHeartAngleA;
  uniform float uHeartAngleB;
  uniform vec2 uViewport;
  uniform float uHeartTrace;
  uniform float uHeartTipWeight;
  uniform float uHeartCoreAlpha;
  uniform vec3 uHeartTip;
  uniform float uDark;
  attribute float aSide;
  mat3 turn(float side) {
    float angle = side > 0.0 ? uHeartAngleA : uHeartAngleB;
    return mat3(cos(angle),0.0,-sin(angle),0.0,1.0,0.0,sin(angle),0.0,cos(angle));
  }
  vec3 heartWorld(vec3 local, float side) {
    vec3 centre = side > 0.0 ? uHeartCenterA : uHeartCenterB;
    return uMerge + uBasis * ((centre + turn(side) * local * uMarkerScale) * uScale);
  }
`;
const ribbonVertex = /* glsl */ `
  ${common}
  attribute vec3 aPrevious;
  attribute vec3 aNext;
  attribute float aU;
  attribute float aEdge;
  varying float vU;
  varying float vEdge;
  void main() {
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(heartWorld(position,aSide),1.0);
    vec4 before = projectionMatrix * modelViewMatrix * vec4(heartWorld(aPrevious,aSide),1.0);
    vec4 after = projectionMatrix * modelViewMatrix * vec4(heartWorld(aNext,aSide),1.0);
    vec2 tangent = (after.xy/after.w - before.xy/before.w) * uViewport;
    tangent /= max(length(tangent),0.0001);
    vec2 perpendicular = vec2(-tangent.y,tangent.x);
    // A screen-space ribbon gives the same fine stroke on Retina and desktop.
    // It does not depend on unsupported WebGL line widths.
    clip.xy += perpendicular * aEdge * 1.55 * uPixelRatio * 2.0 / uViewport * clip.w;
    gl_Position = clip;
    vU = aU;
    vEdge = aEdge;
  }
`;
const ribbonFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uDark;
  uniform float uProgress;
  uniform float uHeartTrace;
  varying float vU;
  varying float vEdge;
  void main() {
    if(vU > uHeartTrace) discard;
    float edge = abs(vEdge);
    float ink = 1.0 - smoothstep(0.23,0.51,edge);
    float fringe = (1.0 - edge) * mix(0.045,0.11,uDark);
    float appear = smoothstep(0.735,0.740,uProgress);
    float fracture = 1.0 - smoothstep(0.87,0.874,uProgress);
    float alpha = (ink * 0.88 + fringe) * appear * fracture;
    if(alpha < 0.002) discard;
    gl_FragColor = vec4(uColor,alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
const penVertex = /* glsl */ `
  ${common}
  attribute float aHalo;
  varying float vAlpha;
  varying float vSoftness;
  void main() {
    vec3 world = heartWorld(uHeartTip * uHeartTipWeight,aSide);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(world,1.0);
    gl_PointSize = (aHalo > 0.5 ? mix(6.5,9.0,uDark) : mix(2.8,3.6,uDark)) * uPixelRatio;
    vAlpha = uHeartCoreAlpha * (aHalo > 0.5 ? mix(0.13,0.22,uDark) : 0.96);
    vSoftness = aHalo;
  }
`;

export function createHeartLightTrails(uniforms) {
  const positions=[], previous=[], next=[], sides=[], fractions=[], edges=[];
  const append = (index, edge, side) => {
    positions.push(...contour[index]);
    previous.push(...contour[(index + HEART_TRACE_SEGMENTS - 1) % HEART_TRACE_SEGMENTS]);
    next.push(...contour[(index + 1) % HEART_TRACE_SEGMENTS]);
    sides.push(side); fractions.push(index / HEART_TRACE_SEGMENTS); edges.push(edge);
  };
  for(const side of [1,-1]) for(let i=0;i<HEART_TRACE_SEGMENTS;i++) {
    for(const [offset,edge] of [[0,-1],[0,1],[1,-1],[1,-1],[0,1],[1,1]]) append(i+offset,edge,side);
  }
  const ribbonGeometry = new THREE.BufferGeometry();
  for(const [name,array,size] of [
    ['position',positions,3],['aPrevious',previous,3],['aNext',next,3],
    ['aSide',sides,1],['aU',fractions,1],['aEdge',edges,1],
  ]) ribbonGeometry.setAttribute(name,new THREE.Float32BufferAttribute(array,size));
  const options={uniforms,transparent:true,depthWrite:false,depthTest:false,
    blending:THREE.NormalBlending,toneMapped:false};
  const ribbonMaterial = new THREE.ShaderMaterial({...options,side:THREE.DoubleSide,
    vertexShader:ribbonVertex,fragmentShader:ribbonFragment});
  const ribbon = new THREE.Mesh(ribbonGeometry,ribbonMaterial);
  ribbon.name='two-light-drawn-heart-contours'; ribbon.frustumCulled=false; ribbon.renderOrder=5;
  const penGeometry = new THREE.BufferGeometry();
  penGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(12),3));
  penGeometry.setAttribute('aSide',new THREE.Float32BufferAttribute([1,1,-1,-1],1));
  penGeometry.setAttribute('aHalo',new THREE.Float32BufferAttribute([0,1,0,1],1));
  const penMaterial = new THREE.ShaderMaterial({...options,vertexShader:penVertex,fragmentShader:originalPointFragment});
  const pens = new THREE.Points(penGeometry,penMaterial);
  pens.name='two-heart-tracing-light-cores'; pens.frustumCulled=false; pens.renderOrder=6;
  return {
    objects:[ribbon,pens],
    update(p){ribbon.visible=p>.735&&p<.874;pens.visible=p>.685&&p<.803;},
    dispose(){ribbonGeometry.dispose();ribbonMaterial.dispose();penGeometry.dispose();penMaterial.dispose();},
  };
}
