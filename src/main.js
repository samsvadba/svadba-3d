import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
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
renderer.toneMappingExposure = 1.12

const scene = new THREE.Scene()

scene.fog = new THREE.FogExp2(
  0x0f0d0c,
  0.03
)

const pmremGenerator =
  new THREE.PMREMGenerator(renderer)

const environment =
  pmremGenerator.fromScene(
    new RoomEnvironment(),
    0.04
  ).texture

scene.environment = environment

pmremGenerator.dispose()

const camera = new THREE.PerspectiveCamera(
  38,
  window.innerWidth / window.innerHeight,
  0.1,
  100
)

camera.position.set(
  0,
  0.15,
  10.8
)

const ambient =
  new THREE.AmbientLight(
    0xffead2,
    0.55
  )

scene.add(ambient)

const warmLight =
  new THREE.PointLight(
    0xffc878,
    42,
    28
  )

warmLight.position.set(
  5,
  6,
  7
)

scene.add(warmLight)

const frontLight =
  new THREE.PointLight(
    0xffefd9,
    34,
    25
  )

frontLight.position.set(
  -4,
  2.5,
  7
)

scene.add(frontLight)

const rimLight =
  new THREE.PointLight(
    0xd8c1a0,
    25,
    20
  )

rimLight.position.set(
  1,
  -4,
  4
)

scene.add(rimLight)

function createBandGeometry() {
  const outerRadius = 1.48
  const innerRadius = 1.22

  const shape =
    new THREE.Shape()

  shape.absarc(
    0,
    0,
    outerRadius,
    0,
    Math.PI * 2,
    false
  )

  const hole =
    new THREE.Path()

  hole.absarc(
    0,
    0,
    innerRadius,
    0,
    Math.PI * 2,
    true
  )

  shape.holes.push(hole)

  const geometry =
    new THREE.ExtrudeGeometry(
      shape,
      {
        depth: 0.26,
        steps: 1,
        curveSegments: 96,

        bevelEnabled: true,
        bevelSegments: 6,
        bevelSize: 0.045,
        bevelThickness: 0.045
      }
    )

  geometry.translate(
    0,
    0,
    -0.13
  )

  geometry.computeVertexNormals()

  return geometry
}

const ringGeometry =
  createBandGeometry()

function createMatteGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xcfa45f,
    metalness: 0.9,
    roughness: 0.5,
    clearcoat: 0.08,
    clearcoatRoughness: 0.5,
    reflectivity: 0.75,
    envMapIntensity: 0.8,
    transparent: true,
    opacity: 1
  })
}

function createPolishedGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xd8ad66,
    metalness: 0.95,
    roughness: 0.25,
    clearcoat: 0.25,
    clearcoatRoughness: 0.2,
    reflectivity: 0.9,
    envMapIntensity: 0.9,
    transparent: true,
    opacity: 1
  })
}

const matteGoldA =
  createMatteGold()

const polishedGoldA =
  createPolishedGold()

const matteGoldB =
  createMatteGold()

const polishedGoldB =
  createPolishedGold()

const ringA =
  new THREE.Mesh(
    ringGeometry,
    [
      matteGoldA,
      polishedGoldA
    ]
  )

ringA.position.set(
  -0.78,
  0.42,
  -0.58
)

ringA.rotation.set(
  0.82,
  -0.12,
  -0.27
)

const ringB =
  new THREE.Mesh(
    ringGeometry,
    [
      matteGoldB,
      polishedGoldB
    ]
  )

ringB.position.set(
  0.72,
  -0.28,
  0.1
)

ringB.rotation.set(
  1.07,
  0.2,
  0.22
)

const rig =
  new THREE.Group()

rig.add(
  ringA,
  ringB
)

scene.add(rig)

const haloGeometry =
  new THREE.RingGeometry(
    2.3,
    5,
    96
  )

const haloMaterial =
  new THREE.MeshBasicMaterial({
    color: 0xb98d52,
    transparent: true,
    opacity: 0.018,
    side: THREE.DoubleSide,
    depthWrite: false
  })

const halo =
  new THREE.Mesh(
    haloGeometry,
    haloMaterial
  )

halo.position.z = -3

scene.add(halo)

const particlesCount = 850

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
    color: 0xe2c391,
    size: 0.019,
    transparent: true,
    opacity: 0.3,
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

        start:
          'top 72%',

        end:
          'center 50%',

        scrub: true
      }
    }
  )

  gsap.to(
    chapter,
    {
      opacity: 0,
      y: -34,
      ease: 'none',

      scrollTrigger: {
        trigger:
          chapter.parentElement,

        start:
          'center 42%',

        end:
          'bottom 18%',

        scrub: true
      }
    }
  )
})

const timeline =
  gsap.timeline({
    defaults: {
      ease: 'power2.inOut'
    },

    scrollTrigger: {
      trigger:
        '#experience',

      start:
        'top top',

      end:
        'bottom bottom',

      scrub: 1.4
    }
  })

timeline

  .to(
    camera.position,
    {
      z: 9,
      duration: 1
    }
  )

  .to(
    ringA.position,
    {
      x: -0.55,
      y: 0.28,
      duration: 1
    },
    '<'
  )

  .to(
    ringB.position,
    {
      x: 0.55,
      y: -0.18,
      duration: 1
    },
    '<'
  )

  .to(
    rig.rotation,
    {
      y:
        Math.PI * 0.3,

      x:
        0.05,

      duration:
        1.2
    }
  )

  .to(
    camera.position,
    {
      x: 1.3,
      y: 0.5,
      z: 7.5,

      duration: 1.1
    }
  )

  .to(
    rig.rotation,
    {
      y:
        Math.PI * 0.72,

      z:
        0.1,

      duration: 1.1
    },
    '<'
  )

  .to(
    camera.position,
    {
      x: -1.15,
      y: -0.35,
      z: 6.5,

      duration: 1.1
    }
  )

  .to(
    ringA.rotation,
    {
      z: 0.62,
      duration: 1
    },
    '<'
  )

  .to(
    ringB.rotation,
    {
      z: -0.5,
      duration: 1
    },
    '<'
  )

  .to(
    ringA.position,
    {
      x: -0.15,
      y: 0.05,
      z: -0.05,

      duration: 1.1
    }
  )

  .to(
    ringB.position,
    {
      x: 0.15,
      y: -0.05,
      z: 0.08,

      duration: 1.1
    },
    '<'
  )

  .to(
    camera.position,
    {
      x: 0,
      y: 0.1,
      z: 5,

      duration: 1.2
    }
  )

  .to(
    rig.rotation,
    {
      y:
        Math.PI * 1.35,

      x:
        -0.06,

      duration:
        1.2
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
      matteGoldA,
      polishedGoldA,
      matteGoldB,
      polishedGoldB
    ],
    {
      opacity: 0.1,
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

function updateScale() {
  const mobile =
    window.innerWidth < 700

  rig.scale.setScalar(
    mobile
      ? 0.68
      : 0.9
  )
}

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

  updateScale()
}

window.addEventListener(
  'resize',
  resize
)

updateScale()

const clock =
  new THREE.Clock()

function render() {
  const t =
    clock.getElapsedTime()

  particles.rotation.y =
    t * 0.003

  particles.rotation.x =
    Math.sin(
      t * 0.08
    ) * 0.02

  rig.position.y =
    Math.sin(
      t * 0.55
    ) * 0.035

  warmLight.position.x =
    5 +
    Math.sin(
      t * 0.55
    ) * 0.8

  frontLight.position.y =
    2.5 +
    Math.sin(
      t * 0.4
    ) * 0.4

  renderer.render(
    scene,
    camera
  )

  requestAnimationFrame(
    render
  )
}

render()