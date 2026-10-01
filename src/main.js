import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './style.css'

gsap.registerPlugin(ScrollTrigger)

const canvas = document.querySelector('#scene')

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
})

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.15

const scene = new THREE.Scene()

scene.fog = new THREE.FogExp2(
  0x0f0d0c,
  0.032
)

const camera = new THREE.PerspectiveCamera(
  38,
  window.innerWidth / window.innerHeight,
  0.1,
  100
)

camera.position.set(0, 0.2, 11.5)

scene.add(
  new THREE.AmbientLight(
    0xfff2e0,
    0.8
  )
)

const warmLight = new THREE.PointLight(
  0xffc98c,
  65,
  26
)

warmLight.position.set(
  4.8,
  5.5,
  5.5
)

scene.add(warmLight)

const softLight = new THREE.PointLight(
  0xf4e6d8,
  30,
  22
)

softLight.position.set(
  -4.5,
  2,
  5
)

scene.add(softLight)

const rimLight = new THREE.PointLight(
  0xd9c8ff,
  28,
  22
)

rimLight.position.set(
  -3,
  -4,
  2
)

scene.add(rimLight)

const topLight = new THREE.DirectionalLight(
  0xffe5c3,
  1.5
)

topLight.position.set(
  0,
  5,
  2
)

scene.add(topLight)

const ringGeometry =
  new THREE.TorusGeometry(
    1.38,
    0.10,
    64,
    240
  )

const ringMaterialA =
  new THREE.MeshPhysicalMaterial({
    color: 0xd7ad68,
    metalness: 1,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    reflectivity: 1,
    transparent: true,
    opacity: 1
  })

const ringMaterialB =
  ringMaterialA.clone()

const ringA =
  new THREE.Mesh(
    ringGeometry,
    ringMaterialA
  )

ringA.position.set(
  -0.82,
  0.18,
  0
)

ringA.rotation.set(
  0.72,
  -0.2,
  0.38
)

const ringB =
  new THREE.Mesh(
    ringGeometry,
    ringMaterialB
  )

ringB.position.set(
  0.82,
  -0.18,
  -0.18
)

ringB.rotation.set(
  1.1,
  0.28,
  -0.42
)

const rig = new THREE.Group()

rig.add(
  ringA,
  ringB
)

scene.add(rig)

const haloGeometry =
  new THREE.RingGeometry(
    2.1,
    4.6,
    96
  )

const haloMaterial =
  new THREE.MeshBasicMaterial({
    color: 0xc49a63,
    transparent: true,
    opacity: 0.025,
    side: THREE.DoubleSide,
    depthWrite: false
  })

const halo =
  new THREE.Mesh(
    haloGeometry,
    haloMaterial
  )

halo.position.z = -2.8
halo.rotation.x =
  Math.PI * 0.5

scene.add(halo)

const particlesCount = 1100

const positions =
  new Float32Array(
    particlesCount * 3
  )

for (
  let i = 0;
  i < particlesCount;
  i++
) {
  positions[i * 3] =
    (Math.random() - 0.5) * 30

  positions[i * 3 + 1] =
    (Math.random() - 0.5) * 20

  positions[i * 3 + 2] =
    (Math.random() - 0.5) * 22
}

const particlesGeometry =
  new THREE.BufferGeometry()

particlesGeometry.setAttribute(
  'position',
  new THREE.BufferAttribute(
    positions,
    3
  )
)

const particlesMaterial =
  new THREE.PointsMaterial({
    color: 0xe6cba4,
    size: 0.022,
    transparent: true,
    opacity: 0.4,
    depthWrite: false
  })

const particles =
  new THREE.Points(
    particlesGeometry,
    particlesMaterial
  )

scene.add(particles)

const chapters =
  gsap.utils.toArray(
    '.chapter__inner'
  )

chapters.forEach((chapter) => {
  gsap.fromTo(
    chapter,
    {
      opacity: 0,
      y: 42
    },
    {
      opacity: 1,
      y: 0,
      ease: 'none',
      scrollTrigger: {
        trigger:
          chapter.parentElement,
        start: 'top 72%',
        end: 'center 50%',
        scrub: true
      }
    }
  )

  gsap.to(chapter, {
    opacity: 0,
    y: -34,
    ease: 'none',
    scrollTrigger: {
      trigger:
        chapter.parentElement,
      start: 'center 42%',
      end: 'bottom 18%',
      scrub: true
    }
  })
})

const timeline =
  gsap.timeline({
    defaults: {
      ease:
        'power2.inOut'
    },

    scrollTrigger: {
      trigger: '#experience',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.4
    }
  })

timeline

  .to(
    camera.position,
    {
      z: 9.2,
      y: 0,
      duration: 1
    }
  )

  .to(
    ringA.position,
    {
      x: -0.48,
      y: 0.08,
      duration: 1
    },
    '<'
  )

  .to(
    ringB.position,
    {
      x: 0.48,
      y: -0.08,
      duration: 1
    },
    '<'
  )

  .to(
    rig.rotation,
    {
      y:
        Math.PI * 0.55,
      x: 0.12,
      duration: 1.15
    }
  )

  .to(
    camera.position,
    {
      x: 1.7,
      y: 0.6,
      z: 7.7,
      duration: 1.1
    }
  )

  .to(
    rig.rotation,
    {
      y:
        Math.PI * 1.2,
      z: 0.14,
      duration: 1.1
    },
    '<'
  )

  .to(
    camera.position,
    {
      x: -1.5,
      y: -0.4,
      z: 6.7,
      duration: 1.1
    }
  )

  .to(
    ringA.rotation,
    {
      z: 1.4,
      duration: 1
    },
    '<'
  )

  .to(
    ringB.rotation,
    {
      z: -1.35,
      duration: 1
    },
    '<'
  )

  .to(
    ringA.position,
    {
      x: -0.12,
      y: 0,
      z: 0.04,
      duration: 1.1
    }
  )

  .to(
    ringB.position,
    {
      x: 0.12,
      y: 0,
      z: -0.04,
      duration: 1.1
    },
    '<'
  )

  .to(
    camera.position,
    {
      x: 0,
      y: 0.15,
      z: 5.2,
      duration: 1.2
    }
  )

  .to(
    rig.rotation,
    {
      y:
        Math.PI * 2.1,
      x: -0.08,
      duration: 1.2
    },
    '<'
  )

  .to(
    camera.position,
    {
      z: 3.7,
      duration: 1
    }
  )

  .to(
    [
      ringMaterialA,
      ringMaterialB
    ],
    {
      opacity: 0.12,
      duration: 0.8
    }
  )

  .to(
    haloMaterial,
    {
      opacity: 0,
      duration: 0.8
    },
    '<'
  )

function resize() {
  camera.aspect =
    window.innerWidth /
    window.innerHeight

  camera.updateProjectionMatrix()

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  )

  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio,
      2
    )
  )
}

window.addEventListener(
  'resize',
  resize
)

const clock =
  new THREE.Clock()

function render() {
  const t =
    clock.getElapsedTime()

  particles.rotation.y =
    t * 0.004

  particles.rotation.x =
    Math.sin(t * 0.08) *
    0.025

  rig.position.y =
    Math.sin(t * 0.6) *
    0.045

  ringA.rotation.y +=
    0.00055

  ringB.rotation.y -=
    0.00045

  halo.rotation.z =
    t * 0.012

  warmLight.position.x =
    4.8 +
    Math.sin(t * 0.7) *
      0.6

  renderer.render(
    scene,
    camera
  )

  requestAnimationFrame(
    render
  )
}

render()