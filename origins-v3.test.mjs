// Focused native origin-marker lifecycle regression: no browser/WebGL required.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createOrigins } from './origins-v3.js';

class Element {
  constructor(tag='div') {
    this.tagName=tag;this.children=[];this.attributes=new Map();this.listeners=new Map();
    this.style={setProperty(name,value){this[name]=value;}};this.classList={add(){}};
  }
  append(...elements){this.children.push(...elements);}
  setAttribute(name,value){this.attributes.set(name,String(value));}
  getAttribute(name){return this.attributes.get(name);}
  addEventListener(name,handler){this.listeners.set(name,handler);}
  set innerHTML(value){this.html=value;this.textNodes=new Map([['strong',{}],['.origin-tooltip>span',{}]]);}
  querySelector(selector){return this.textNodes.get(selector);}
  contains(target){return target===this||this.children.some(child=>child.contains?.(target));}
  blur(){document.activeElement=null;}
}

const originalDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
Object.defineProperty(globalThis,'document',{configurable:true,value:{
  activeElement:null,createElement:tag=>new Element(tag),
  createElementNS(namespace,tag){const element=new Element(tag);element.namespaceURI=namespace;return element;},
  addEventListener(){},
}});

try {
  let killed=0;
  const root=new Element(),timeline={to(){return this;},kill(){killed++;}};
  const markers=createOrigins(root,[{name:'Hlohovec',person:'Martin',lat:48.43,lon:17.80},{name:'Cífer',person:'Simona',lat:48.31,lon:17.49}],{
    THREE,gsap:{timeline:()=>timeline},reducedMotion:{matches:false},radius:12.17,
  });
  const layer=root.children[0],lines=layer.children[0].children,buttons=layer.children.slice(1);
  assert.equal(layer.hidden,true,'New native origins must be hidden while Intro is still loading');
  assert.equal(layer.inert,true);
  const phi=THREE.MathUtils.degToRad(90-48),theta=THREE.MathUtils.degToRad(17+180);
  const camera=new THREE.PerspectiveCamera(45,390/844,.1,1000);
  camera.position.set(-70*Math.sin(phi)*Math.cos(theta),70*Math.cos(phi),70*Math.sin(phi)*Math.sin(theta));
  camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const group=new THREE.Group();group.updateMatrixWorld();
  const update=(reveal,interactive)=>markers.update(camera,group,390,844,reveal,interactive);

  update(1,true);
  assert.equal(layer.hidden,false);assert.equal(layer.inert,false);
  for(const button of buttons){assert.equal(button.style.visibility,'visible');assert.equal(button.tabIndex,0);assert.equal(button.style.pointerEvents,'auto');}
  buttons[0].listeners.get('click')({stopPropagation(){}});
  assert.equal(buttons[0].getAttribute('aria-expanded'),'true');document.activeElement=buttons[0];
  markers.pulse();markers.reset();
  assert.equal(killed,1);assert.equal(document.activeElement,null);
  assert.equal(layer.hidden,true);assert.equal(layer.inert,true);assert.equal(layer.getAttribute('aria-hidden'),'true');
  for(const button of buttons){
    assert.equal(button.style.visibility,'hidden');assert.equal(button.style.opacity,0);assert.equal(button.tabIndex,-1);
    assert.equal(button.style.pointerEvents,'none');assert.equal(button.getAttribute('aria-expanded'),'false');assert.equal(button.getAttribute('aria-hidden'),'true');
  }
  for(const line of lines)assert.equal(line.style.opacity,0);
  // Native rendering is suspended during Intro: reset must be sufficient by itself.
  assert.equal(layer.hidden,true);
  update(0,false);assert.equal(layer.hidden,true);
  update(.8,false);assert.equal(layer.hidden,false);assert.equal(layer.inert,true);
  for(const button of buttons){assert.equal(button.style.pointerEvents,'none');assert.equal(button.tabIndex,-1);}
  update(1,true);assert.equal(layer.hidden,false);assert.equal(layer.inert,false);
  for(const button of buttons){assert.equal(button.style.visibility,'visible');assert.equal(button.tabIndex,0);}
  markers.reset();assert.equal(layer.hidden,true);
  console.log('PASS: native origin reset hides stale markers, closes focus/tooltips and resumes only on Journey reveal.');
} finally {
  if(originalDocument)Object.defineProperty(globalThis,'document',originalDocument);else delete globalThis.document;
}
