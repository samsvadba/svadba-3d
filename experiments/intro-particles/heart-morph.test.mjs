// Existing test entry retained for the direct star-impact → Earth regression.
// No browser, network, independent simulation or live guest data is involved.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import config from '../../config-v3.js';
import {createParticles, HEART_BOUNDS} from './particles.js';
import {createChoreography, STORY_PHASES} from './choreography.js';
import {toStoryProgress, STORY_DURATION} from './pacing.js';

const native = await readFile(new URL('../../intro-particles-v3.js',import.meta.url),'utf8');
const prototype = await readFile(new URL('./main.js',import.meta.url),'utf8');
const source = await readFile(new URL('./particles.js',import.meta.url),'utf8');
assert.ok(!/createHeartLightTrails|sampleHeartPose|sampleHeartTrace|aHeart|aMarker|uHeart/.test(source),
  'An unused or hidden heart rendering path remains');
assert.ok(!Object.keys(STORY_PHASES).some(key=>/heart|twin|trace|gather/i.test(key)));
assert.equal(STORY_DURATION,17.2);
assert.deepEqual(STORY_PHASES.burst,[.64,.72]);
assert.deepEqual(STORY_PHASES.reform,[.70,.995]);
assert.match(native,/formationSurface:\s*score\s*>=\s*\.64\s*\?\s*pose\.globeOpacity\s*:\s*pose\.globeReveal/);
assert.match(prototype,/formationSurface:score>=\.64\?pose\.globeOpacity:pose\.globeReveal/);
assert.match(source,/float reform = smoothPhase\(0\.70, 0\.995\)/);
assert.match(source,/worldPosition = mix\(worldPosition, aFormation, reform\) \+ curl/);
assert.match(source,/mix\(aBurstActive, 1\.0, reform\)/,
  'Extra geography points must enter gradually instead of popping at draw-range expansion');
assert.match(source,/float t = clamp\(\(uProgress - 0\.638\) \/ 0\.052, 0\.0, 1\.0\)/);

// Compare the complete pre-impact score to the former 22.1-second score. Its
// tangent at the star collision is preserved even though all later time is cut.
const oldDuration=22.1;
const oldInput=[0,4,5,7.5,8.12,8.3,13.3,15,15.6,16.15,18.3,19,21.9,22.1].map(t=>t/oldDuration);
const oldScore=[0,.144,.18,.30,.37,.39,.64,.72,.735,.795,.87,.895,.995,1];
const oldSlopes=oldInput.slice(1).map((x,i)=>(oldScore[i+1]-oldScore[i])/(x-oldInput[i]));
const oldTangents=oldInput.map((_,i)=>{
  if(i<=2)return .036*oldDuration;
  if(i===oldInput.length-1)return oldSlopes.at(-1);
  const before=oldInput[i]-oldInput[i-1],after=oldInput[i+1]-oldInput[i];
  const a=2*after+before,b=after+2*before;
  return (a+b)/(a/oldSlopes[i-1]+b/oldSlopes[i]);
});
function oldProgress(seconds){
  const p=seconds/oldDuration;let i=0;
  while(i<oldInput.length-2&&p>oldInput[i+1])i++;
  const width=oldInput[i+1]-oldInput[i],t=(p-oldInput[i])/width,t2=t*t,t3=t2*t;
  return (2*t3-3*t2+1)*oldScore[i]+(t3-2*t2+t)*width*oldTangents[i]
    +(-2*t3+3*t2)*oldScore[i+1]+(t3-t2)*width*oldTangents[i+1];
}
for(let milliseconds=0;milliseconds<=13300;milliseconds+=5){
  const t=milliseconds/1000;
  assert.ok(Math.abs(toStoryProgress(t/STORY_DURATION)-oldProgress(t))<1e-12,
    `Earlier globe/town/star timing changed at ${t}s`);
}

const radius=config.GLOBE_RADIUS;
function geo(lat,lon,r=radius){
  const phi=THREE.MathUtils.degToRad(90-lat),theta=THREE.MathUtils.degToRad(lon+180);
  return new THREE.Vector3(-r*Math.sin(phi)*Math.cos(theta),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(theta));
}
const origins=config.origins.map(origin=>geo(origin.lat,origin.lon,radius+.065));
const home=geo((config.origins[0].lat+config.origins[1].lat)/2,(config.origins[0].lon+config.origins[1].lon)/2,1);
const choreography=createChoreography({homeDirection:home,startDirection:geo(30,15,1),radius});
const positions=new Float32Array([12.045,0,0,0,12.045,0,0,12.045,0,0,0,12.045]);
const effect=createParticles({count:16000,mobile:true,formationPositions:positions});
assert.equal(effect.group.children.length,3,'Only particles, stars and one flash may be rendered');
const points=effect.group.children[0],geometry=points.geometry,uniforms=points.material.uniforms;
assert.ok(!Object.keys(geometry.attributes).some(name=>/heart|marker/i.test(name)));
assert.ok(!Object.keys(uniforms).some(name=>/heart|marker/i.test(name)));
const cached=Object.fromEntries(Object.entries(geometry.attributes).map(([key,attribute])=>[key,attribute.array]));
const color=new THREE.Color('#303D29');
const smooth=(a,b,p)=>THREE.MathUtils.smoothstep(p,a,b);
const samples=[0,17,299,1500,7999,15999];
const world=new THREE.Vector3(),flight=new THREE.Vector3(),direction=new THREE.Vector3(),target=new THREE.Vector3(),curl=new THREE.Vector3();
function pointAt(p,index,pose){
  direction.fromBufferAttribute(geometry.getAttribute('aExplosion'),index);
  const seeds=geometry.getAttribute('aSeed'),x=seeds.getX(index),y=seeds.getY(index),z=seeds.getZ(index);
  const burst=THREE.MathUtils.clamp((p-.64)/.08,0,1),expansion=1-(1-burst)**3;
  const drift=p*17+x*Math.PI*2,cloud=Math.sin(burst*Math.PI);
  flight.copy(direction).multiplyScalar(expansion*pose.heartScale*(1.35+y*.75));
  flight.add(new THREE.Vector3(Math.sin(drift),Math.cos(drift*.83),Math.sin(drift*.71))
    .multiplyScalar(Math.sin(burst*Math.PI)*pose.heartScale*.11));
  const angle=x*Math.PI*2+burst*(3.4+y*2);
  flight.add(new THREE.Vector3(Math.cos(angle),Math.sin(angle),Math.sin(angle*.73+z*Math.PI*2))
    .multiplyScalar(cloud*pose.heartScale*(.08+z*.12)));
  const reform=smooth(.70,.995,p);
  target.fromBufferAttribute(geometry.getAttribute('aFormation'),index);
  world.copy(flight).applyQuaternion(pose.basis).add(pose.merge);
  curl.copy(direction).cross(target.clone().normalize()).multiplyScalar(Math.sin(reform*Math.PI)*pose.heartScale*.16);
  return world.lerp(target,reform).add(curl).clone();
}
for(const [width,height] of [[390,844],[430,932],[844,390],[1440,720],[1440,900]]){
  const snapshots=[];
  for(let step=0;step<=1000;step++){
    const p=.64+.36*step/1000;
    const pose=choreography.sample(p,{width,height,heartBounds:HEART_BOUNDS});
    effect.update({progress:p,origins,merge:pose.merge,heartScale:pose.heartScale,color,basis:pose.basis,formationSurface:pose.globeOpacity});
    assert.equal(points.material.depthTest,p>=1);
    assert.equal(effect.group.children[2].visible,p>.638&&p<.690,'A second flash remains after the star collision');
    assert.equal(geometry.drawRange.count,p<.70?12000:16000);
    for(const [name,attribute] of Object.entries(geometry.attributes))assert.equal(attribute.array,cached[name]);
    const values=samples.flatMap(index=>pointAt(p,index,pose).toArray());
    assert.ok(values.every(Number.isFinite));snapshots.push(values);
  }
  for(let step=1000;step>=0;step--){
    const p=.64+.36*step/1000,pose=choreography.sample(p,{width,height,heartBounds:HEART_BOUNDS});
    assert.deepEqual(samples.flatMap(index=>pointAt(p,index,pose).toArray()),snapshots[step]);
  }
  for(const boundary of [.64,.70,.72,.995]){
    const a=choreography.sample(boundary-1e-7,{width,height});
    const before=samples.map(index=>pointAt(boundary-1e-7,index,a));
    const b=choreography.sample(boundary+1e-7,{width,height});
    for(const [slot,index] of samples.entries())assert.ok(pointAt(boundary+1e-7,index,b).distanceTo(before[slot])<.001,
      `The collision/geographic morph jumps at ${boundary}`);
  }
  const final=choreography.sample(.995,{width,height});
  for(const index of samples){
    target.fromBufferAttribute(geometry.getAttribute('aFormation'),index);
    assert.ok(pointAt(.995,index,final).distanceTo(target)<1e-10,'Final cloud retains an impact offset');
  }
}
const released=new Set();
for(const object of effect.group.children)for(const resource of [object.geometry,object.material])resource.addEventListener('dispose',()=>released.add(resource));
effect.dispose();assert.equal(released.size,6);
console.log('PASS — no heart meshes, pens, GPU attributes, uniforms or hidden heart stages; one stars-to-Earth impact only.');
console.log('PASS — 2,661 pre-impact timing samples exactly preserve the existing globe, towns, camera and star flight.');
console.log('PASS — continuous/reversible cloud → real geographic targets at five viewports, stable GPU buffers, clean endpoint/disposal.');
