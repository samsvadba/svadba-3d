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

const scene = new THREE.Scene()

scene.fog = new THREE.FogExp2(
  0x11100f,
  0.038
)

const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.1,
  120
)

camera.position.set(0, 0, 12)

const ambient = new THREE.AmbientLight(
  0xf5e8d6,
  1.7
)

scene.add(ambient)

const keyLight = new THREE.PointLight(
  0xffd8a8,
  45,
  30
)

keyLight.position.set(5, 7, 7)

scene.add(keyLight)

const rimLight = new THREE.PointLight(
  0xc6c8ff,
  22,
  25
)

rimLight.position.set(-7, -2, 4)

scene.add(rimLight)

const ringMaterialA = new THREE.MeshStandardMaterial({
  color: 0xd9b477,
  metalness: 1,
  roughness: 0.18,
  transparent: true,
  opacity: 1
})

const ringMaterialB = ringMaterialA.clone()

const ringGeometry = new THREE.TorusGeometry(
  1.45,
  0.085,
  40,
  180
)

const ringA = new THREE.Mesh(
  ringGeometry,
  ringMaterialA
)

ringA.rotation.set(
  0.72,
  0.2,
  0.32
)

ringA.position.set(
  -1.05,
  0.15,
  0
)

const ringB = new THREE.Mesh(
  ringGeometry,
  ringMaterialB
)

ringB.rotation.set(
  1.18,
  -0.32,
  -0.32
)

ringB.position.set(
  1.05,
  -0.15,
  -0.15
)

const rig = new THREE.Group()

rig.add(
  ringA,
  ringB
)

scene.add(rig)

const particlesCount = 900

const positions = new Float32Array(
  particlesCount * 3
)

for (let i = 0; i < particlesCount; i++) {
  positions[i * 3] =
    (Math.random() - 0.5) * 34

  positions[i * 3 + 1] =
    (Math.random() - 0.5) * 22

  positions[i * 3 + 2] =
    (Math.random() - 0.5) * 24
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
    color: 0xe4cda9,
    size: 0.025,
    transparent: true,
    opacity: 0.55,
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
  gsap.to(chapter, {
    opacity: 1,
    y: 0,
    ease: 'none',
    scrollTrigger: {
      trigger: chapter.parentElement,
      start: 'top 65%',
      end: 'center 45%',
      scrub: true
    }
  })

  gsap.to(chapter, {
    opacity: 0,
    y: -32,
    ease: 'none',
    scrollTrigger: {
      trigger: chapter.parentElement,
      start: 'center 40%',
      end: 'bottom 20%',
      scrub: true
    }
  })
})

const timeline = gsap.timeline({
  scrollTrigger: {
    trigger: '#experience',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.1
  }
})

timeline
  .to(camera.position, {
    z: 8.5,
    duration: 1
  })

  .to(
    ringA.position,
    {
      x: -0.55,
      y: 0.08,
      duration: 1
    },
    '<'
  )

  .to(
    ringB.position,
    {
      x: 0.55,
      y: -0.08,
      duration: 1
    },
    '<'
  )

  .to(rig.rotation, {
    y: Math.PI * 0.9,
    x: 0.22,
    duration: 1.2
  })

  .to(camera.position, {
    x: 3.4,
    y: 1.4,
    z: 7.2,
    duration: 1.1
  })

  .to(
    rig.rotation,
    {
      y: Math.PI * 1.7,
      z: 0.22,
      duration: 1.1
    },
    '<'
  )

  .to(camera.position, {
    x: -2.8,
    y: -0.9,
    z: 6.4,
    duration: 1.1
  })

  .to(
    ringA.rotation,
    {
      z: 1.8,
      duration: 1.1
    },
    '<'
  )

  .to(
    ringB.rotation,
    {
      z: -1.7,
      duration: 1.1
    },
    '<'
  )

  .to(camera.position, {
    x: 0,
    y: 0.4,
    z: 5.2,
    duration: 1.1
  })

  .to(
    ringA.position,
    {
      x: -0.12,
      y: 0,
      duration: 1.1
    },
    '<'
  )

  .to(
    ringB.position,
    {
      x: 0.12,
      y: 0,
      duration: 1.1
    },
    '<'
  )

  .to(rig.rotation, {
    y: Math.PI * 2.45,
    x: -0.18,
    duration: 1.1
  })

  .to(camera.position, {
    z: 3.4,
    duration: 1
  })

  .to(
    [
      ringMaterialA,
      ringMaterialB
    ],
    {
      opacity: 0.08,
      duration: 0.7
    }
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

const clock = new THREE.Clock()

function render() {
  const t =
    clock.getElapsedTime()

  particles.rotation.y =
    t * 0.006

  particles.rotation.x =
    Math.sin(t * 0.08) * 0.04

  ringA.rotation.y += 0.0011
  ringB.rotation.y -= 0.0009

  renderer.render(
    scene,
    camera
  )

  requestAnimationFrame(render)
}

render()