import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './style.css'

gsap.registerPlugin(ScrollTrigger)

/* =========================================================
   BASIC SETUP
========================================================= */

const canvas = document.querySelector('#scene')

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
})

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, 2)
)

renderer.setSize(
  window.innerWidth,
  window.innerHeight
)

renderer.outputColorSpace =
  THREE.SRGBColorSpace

renderer.toneMapping =
  THREE.ACESFilmicToneMapping

renderer.toneMappingExposure =
  1.12

const scene =
  new THREE.Scene()

scene.fog =
  new THREE.FogExp2(
    0x080706,
    0.026
  )

const camera =
  new THREE.PerspectiveCamera(
    40,
    window.innerWidth /
      window.innerHeight,
    0.1,
    100
  )

camera.position.set(
  0,
  0.15,
  10.5
)

/* =========================================================
   LIGHTS
========================================================= */

const ambient =
  new THREE.AmbientLight(
    0xffead2,
    0.35
  )

scene.add(ambient)

const warmLight =
  new THREE.PointLight(
    0xffb85f,
    34,
    24
  )

warmLight.position.set(
  4,
  4,
  5
)

scene.add(warmLight)

const softLight =
  new THREE.PointLight(
    0xffead0,
    20,
    20
  )

softLight.position.set(
  -4,
  1,
  5
)

scene.add(softLight)

/* =========================================================
   STAR TEXTURE
========================================================= */

function createStarTexture() {
  const size = 512

  const c =
    document.createElement('canvas')

  c.width = size
  c.height = size

  const ctx =
    c.getContext('2d')

  const center =
    size / 2

  const glow =
    ctx.createRadialGradient(
      center,
      center,
      0,
      center,
      center,
      center
    )

  glow.addColorStop(
    0,
    'rgba(255,255,255,1)'
  )

  glow.addColorStop(
    0.025,
    'rgba(255,250,235,1)'
  )

  glow.addColorStop(
    0.07,
    'rgba(255,227,177,0.95)'
  )

  glow.addColorStop(
    0.16,
    'rgba(255,191,108,0.55)'
  )

  glow.addColorStop(
    0.32,
    'rgba(255,164,77,0.16)'
  )

  glow.addColorStop(
    1,
    'rgba(255,140,50,0)'
  )

  ctx.fillStyle = glow

  ctx.fillRect(
    0,
    0,
    size,
    size
  )

  const horizontal =
    ctx.createLinearGradient(
      0,
      center,
      size,
      center
    )

  horizontal.addColorStop(
    0,
    'rgba(255,255,255,0)'
  )

  horizontal.addColorStop(
    0.48,
    'rgba(255,230,190,0)'
  )

  horizontal.addColorStop(
    0.5,
    'rgba(255,255,255,0.9)'
  )

  horizontal.addColorStop(
    0.52,
    'rgba(255,230,190,0)'
  )

  horizontal.addColorStop(
    1,
    'rgba(255,255,255,0)'
  )

  ctx.fillStyle =
    horizontal

  ctx.fillRect(
    0,
    center - 1,
    size,
    2
  )

  const vertical =
    ctx.createLinearGradient(
      center,
      0,
      center,
      size
    )

  vertical.addColorStop(
    0,
    'rgba(255,255,255,0)'
  )

  vertical.addColorStop(
    0.49,
    'rgba(255,240,210,0)'
  )

  vertical.addColorStop(
    0.5,
    'rgba(255,255,255,0.65)'
  )

  vertical.addColorStop(
    0.51,
    'rgba(255,240,210,0)'
  )

  vertical.addColorStop(
    1,
    'rgba(255,255,255,0)'
  )

  ctx.fillStyle =
    vertical

  ctx.fillRect(
    center - 1,
    0,
    2,
    size
  )

  const texture =
    new THREE.CanvasTexture(c)

  texture.colorSpace =
    THREE.SRGBColorSpace

  return texture
}

const starTexture =
  createStarTexture()

/* =========================================================
   LABEL TEXTURE
========================================================= */

function createLabelTexture(
  place,
  name
) {
  const c =
    document.createElement('canvas')

  c.width = 1024
  c.height = 280

  const ctx =
    c.getContext('2d')

  ctx.clearRect(
    0,
    0,
    c.width,
    c.height
  )

  ctx.textAlign =
    'center'

  ctx.fillStyle =
    'rgba(236,213,178,0.88)'

  ctx.font =
    '300 32px Arial'

  ctx.fillText(
    place.toUpperCase(),
    512,
    110
  )

  ctx.fillStyle =
    'rgba(255,245,230,0.55)'

  ctx.font =
    '300 24px Arial'

  ctx.fillText(
    name,
    512,
    160
  )

  const texture =
    new THREE.CanvasTexture(c)

  texture.colorSpace =
    THREE.SRGBColorSpace

  return texture
}

/* =========================================================
   CREATE MAIN STORY STAR
========================================================= */

function createStoryStar(
  place,
  name,
  color
) {
  const group =
    new THREE.Group()

  const glowMaterial =
    new THREE.SpriteMaterial({
      map: starTexture,
      color,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending:
        THREE.AdditiveBlending
    })

  const glow =
    new THREE.Sprite(
      glowMaterial
    )

  glow.scale.set(
    2.1,
    2.1,
    1
  )

  group.add(glow)

  const coreMaterial =
    new THREE.SpriteMaterial({
      map: starTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending:
        THREE.AdditiveBlending
    })

  const core =
    new THREE.Sprite(
      coreMaterial
    )

  core.scale.set(
    0.42,
    0.42,
    1
  )

  group.add(core)

  const labelMaterial =
    new THREE.SpriteMaterial({
      map:
        createLabelTexture(
          place,
          name
        ),

      transparent: true,
      opacity: 0.72,
      depthWrite: false
    })

  const label =
    new THREE.Sprite(
      labelMaterial
    )

  label.scale.set(
    3.2,
    0.88,
    1
  )

  label.position.y =
    -1.05

  group.add(label)

  return {
    group,
    glow,
    core,
    glowMaterial,
    coreMaterial,
    labelMaterial
  }
}

/* =========================================================
   MARTIN STAR
========================================================= */

const martin =
  createStoryStar(
    'Hlohovec',
    'Martin',
    0xffc56f
  )

martin.group.position.set(
  -3.7,
  0.7,
  0
)

scene.add(
  martin.group
)

/* =========================================================
   SIMONA STAR
========================================================= */

const simona =
  createStoryStar(
    'Cífer',
    'Simona',
    0xffe3ba
  )

simona.group.position.set(
  3.7,
  -0.55,
  -0.15
)

scene.add(
  simona.group
)

/* =========================================================
   BACKGROUND STAR FIELD
========================================================= */

const starCount =
  window.innerWidth < 700
    ? 520
    : 850

const positions =
  new Float32Array(
    starCount * 3
  )

for (
  let i = 0;
  i < starCount;
  i++
) {
  positions[i * 3] =
    (Math.random() - 0.5) *
    30

  positions[i * 3 + 1] =
    (Math.random() - 0.5) *
    18

  positions[i * 3 + 2] =
    -Math.random() * 20
}

const starsGeometry =
  new THREE.BufferGeometry()

starsGeometry.setAttribute(
  'position',
  new THREE.BufferAttribute(
    positions,
    3
  )
)

const starsMaterial =
  new THREE.PointsMaterial({
    color: 0xffe0b0,
    size: 0.023,
    transparent: true,
    opacity: 0.48,
    depthWrite: false
  })

const starField =
  new THREE.Points(
    starsGeometry,
    starsMaterial
  )

scene.add(starField)

/* =========================================================
   STAR TRAILS
========================================================= */

function createTrail(
  points,
  color
) {
  const curve =
    new THREE.CatmullRomCurve3(
      points
    )

  const geometry =
    new THREE.TubeGeometry(
      curve,
      100,
      0.006,
      6,
      false
    )

  const material =
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending:
        THREE.AdditiveBlending
    })

  const mesh =
    new THREE.Mesh(
      geometry,
      material
    )

  scene.add(mesh)

  return {
    mesh,
    material
  }
}

const martinTrail =
  createTrail(
    [
      new THREE.Vector3(
        -4.2,
        0.8,
        -0.5
      ),

      new THREE.Vector3(
        -3,
        0.5,
        -0.2
      ),

      new THREE.Vector3(
        -1.6,
        0.25,
        0
      ),

      new THREE.Vector3(
        -0.2,
        0.05,
        0.1
      )
    ],

    0xd89c4f
  )

const simonaTrail =
  createTrail(
    [
      new THREE.Vector3(
        4.2,
        -0.65,
        -0.5
      ),

      new THREE.Vector3(
        3,
        -0.4,
        -0.2
      ),

      new THREE.Vector3(
        1.5,
        -0.2,
        0
      ),

      new THREE.Vector3(
        0.2,
        -0.05,
        0.1
      )
    ],

    0xe7bd83
  )

/* =========================================================
   FLORENCE
========================================================= */

const florenceRoot =
  new THREE.Group()

const florence =
  new THREE.Group()

florenceRoot.add(
  florence
)

florenceRoot.position.set(
  0,
  -1.5,
  -2
)

scene.add(
  florenceRoot
)

const florenceMaterials = []

function cityMaterial(
  color,
  opacity = 0
) {
  const material =
    new THREE.MeshStandardMaterial({
      color,
      metalness: 0,
      roughness: 0.92,
      transparent: true,
      opacity
    })

  florenceMaterials.push(
    material
  )

  return material
}

function edgeMaterial() {
  const material =
    new THREE.LineBasicMaterial({
      color: 0xc99a60,
      transparent: true,
      opacity: 0
    })

  florenceMaterials.push(
    material
  )

  return material
}

function addEdges(mesh) {
  const edges =
    new THREE.EdgesGeometry(
      mesh.geometry,
      22
    )

  const line =
    new THREE.LineSegments(
      edges,
      edgeMaterial()
    )

  line.position.copy(
    mesh.position
  )

  line.rotation.copy(
    mesh.rotation
  )

  line.scale.copy(
    mesh.scale
  )

  florence.add(line)
}

/* =========================================================
   FLORENCE BUILDINGS
========================================================= */

const cityDark =
  0x171311

const buildingData = [
  [-4.5, -0.05, 1.2, 1.15, 0.7],
  [-3.5, 0.05, 0.85, 1.4, 0.8],
  [-2.6, -0.04, 0.9, 1.18, 0.72],
  [-1.8, 0.03, 0.95, 1.35, 0.78],
  [-0.9, -0.05, 0.7, 1.05, 0.7],
  [0.9, -0.05, 0.8, 1.15, 0.74],
  [1.8, 0.02, 0.95, 1.4, 0.8],
  [2.8, -0.04, 0.8, 1.18, 0.72],
  [3.7, 0.05, 0.95, 1.32, 0.8],
  [4.6, -0.05, 1.05, 1.15, 0.72]
]

buildingData.forEach(
  ([
    x,
    y,
    width,
    height,
    depth
  ]) => {

    const geometry =
      new THREE.BoxGeometry(
        width,
        height,
        depth
      )

    const building =
      new THREE.Mesh(
        geometry,
        cityMaterial(cityDark)
      )

    building.position.set(
      x,
      y,
      0
    )

    florence.add(
      building
    )

    addEdges(
      building
    )
  }
)

/* =========================================================
   DUOMO - BASE
========================================================= */

const cathedralBase =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      1.75,
      1.25,
      1
    ),

    cityMaterial(
      0x1b1714
    )
  )

cathedralBase.position.set(
  -0.05,
  0.18,
  0.1
)

florence.add(
  cathedralBase
)

addEdges(
  cathedralBase
)

/* =========================================================
   DUOMO DRUM
========================================================= */

const drum =
  new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.67,
      0.67,
      0.55,
      32
    ),

    cityMaterial(
      0x201915
    )
  )

drum.position.set(
  -0.05,
  1.03,
  0.1
)

florence.add(
  drum
)

addEdges(
  drum
)

/* =========================================================
   DUOMO DOME
========================================================= */

const dome =
  new THREE.Mesh(
    new THREE.SphereGeometry(
      0.77,
      48,
      24,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    ),

    cityMaterial(
      0x3b2118
    )
  )

dome.position.set(
  -0.05,
  1.3,
  0.1
)

dome.scale.y =
  1.18

florence.add(
  dome
)

/* dome ribs */

for (
  let i = 0;
  i < 8;
  i++
) {
  const angle =
    (i / 8) *
    Math.PI * 2

  const rib =
    new THREE.Mesh(
      new THREE.TorusGeometry(
        0.79,
        0.007,
        5,
        60,
        Math.PI / 2
      ),

      cityMaterial(
        0xb17c48
      )
    )

  rib.rotation.y =
    angle

  rib.rotation.z =
    Math.PI / 2

  rib.position.set(
    -0.05,
    1.31,
    0.1
  )

  rib.scale.y =
    1.18

  florence.add(
    rib
  )
}

/* =========================================================
   DUOMO LANTERN
========================================================= */

const lantern =
  new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.13,
      0.17,
      0.34,
      12
    ),

    cityMaterial(
      0x211914
    )
  )

lantern.position.set(
  -0.05,
  2.22,
  0.1
)

florence.add(
  lantern
)

const lanternTop =
  new THREE.Mesh(
    new THREE.ConeGeometry(
      0.13,
      0.26,
      12
    ),

    cityMaterial(
      0x8d633f
    )
  )

lanternTop.position.set(
  -0.05,
  2.48,
  0.1
)

florence.add(
  lanternTop
)

/* =========================================================
   GIOTTO BELL TOWER
========================================================= */

const tower =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      0.48,
      2.75,
      0.5
    ),

    cityMaterial(
      0x211b17
    )
  )

tower.position.set(
  1.15,
  0.82,
  0.08
)

florence.add(
  tower
)

addEdges(
  tower
)

const towerTop =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      0.57,
      0.18,
      0.58
    ),

    cityMaterial(
      0x9a7048
    )
  )

towerTop.position.set(
  1.15,
  2.28,
  0.08
)

florence.add(
  towerTop
)

/* =========================================================
   FLORENCE WARM WINDOWS
========================================================= */

const windowMaterial =
  new THREE.MeshBasicMaterial({
    color: 0xffb85f,
    transparent: true,
    opacity: 0
  })

florenceMaterials.push(
  windowMaterial
)

for (
  let i = 0;
  i < 22;
  i++
) {
  const windowMesh =
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        0.035,
        0.055
      ),

      windowMaterial
    )

  windowMesh.position.set(
    -4.4 +
      Math.random() * 8.8,

    -0.25 +
      Math.random() * 0.75,

    0.43
  )

  florence.add(
    windowMesh
  )
}

/* =========================================================
   FLORENCE HAZE
========================================================= */

function createGlowTexture() {
  const c =
    document.createElement('canvas')

  c.width = 512
  c.height = 512

  const ctx =
    c.getContext('2d')

  const gradient =
    ctx.createRadialGradient(
      256,
      256,
      0,
      256,
      256,
      256
    )

  gradient.addColorStop(
    0,
    'rgba(210,145,76,0.32)'
  )

  gradient.addColorStop(
    0.35,
    'rgba(170,105,55,0.11)'
  )

  gradient.addColorStop(
    1,
    'rgba(80,40,20,0)'
  )

  ctx.fillStyle =
    gradient

  ctx.fillRect(
    0,
    0,
    512,
    512
  )

  return new THREE.CanvasTexture(c)
}

const florenceGlowMaterial =
  new THREE.SpriteMaterial({
    map: createGlowTexture(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending:
      THREE.AdditiveBlending
  })

florenceMaterials.push(
  florenceGlowMaterial
)

const florenceGlow =
  new THREE.Sprite(
    florenceGlowMaterial
  )

florenceGlow.scale.set(
  10,
  5.5,
  1
)

florenceGlow.position.set(
  0,
  0.5,
  -1
)

florenceRoot.add(
  florenceGlow
)

/* start invisible */

florence.scale.set(
  0.82,
  0.82,
  0.82
)

/* =========================================================
   TEXT CHAPTER ANIMATION
========================================================= */

const chapters =
  gsap.utils.toArray(
    '.chapter__inner'
  )

chapters.forEach(
  (chapter) => {

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
  }
)

/* =========================================================
   STORY TIMELINE
========================================================= */

const story =
  gsap.timeline({
    defaults: {
      ease:
        'power2.inOut'
    },

    scrollTrigger: {
      trigger:
        '#experience',

      start:
        'top top',

      end:
        'bottom bottom',

      scrub:
        1.35
    }
  })

/* ---------------------------------------------------------
   1 - TWO SEPARATE STARS
--------------------------------------------------------- */

story

  .to(
    martinTrail.material,
    {
      opacity: 0.24,
      duration: 0.7
    }
  )

  .to(
    simonaTrail.material,
    {
      opacity: 0.24,
      duration: 0.7
    },
    '<'
  )

  .to(
    martin.group.position,
    {
      x: -2.65,
      y: 0.45,
      duration: 1
    }
  )

  .to(
    simona.group.position,
    {
      x: 2.65,
      y: -0.35,
      duration: 1
    },
    '<'
  )

/* ---------------------------------------------------------
   2 - THEIR PATHS APPROACH
--------------------------------------------------------- */

  .to(
    martin.group.position,
    {
      x: -1.15,
      y: 0.18,
      z: 0.15,
      duration: 1.2
    }
  )

  .to(
    simona.group.position,
    {
      x: 1.15,
      y: -0.14,
      z: 0.15,
      duration: 1.2
    },
    '<'
  )

  .to(
    camera.position,
    {
      z: 9.2,
      duration: 1.2
    },
    '<'
  )

/* ---------------------------------------------------------
   3 - MEETING
--------------------------------------------------------- */

  .to(
    martin.group.position,
    {
      x: -0.24,
      y: 0.08,
      z: 0.25,
      duration: 1.25
    }
  )

  .to(
    simona.group.position,
    {
      x: 0.24,
      y: -0.08,
      z: 0.25,
      duration: 1.25
    },
    '<'
  )

  .to(
    [
      martin.labelMaterial,
      simona.labelMaterial
    ],

    {
      opacity: 0,
      duration: 0.55
    },
    '<'
  )

  .to(
    camera.position,
    {
      z: 8,
      duration: 1
    },
    '<'
  )

/* ---------------------------------------------------------
   4 - FLORENCE EMERGES
--------------------------------------------------------- */

  .to(
    florenceGlowMaterial,
    {
      opacity: 0.42,
      duration: 1
    }
  )

  .to(
    florenceMaterials,
    {
      opacity: 0.78,
      duration: 1.5
    },
    '<'
  )

  .to(
    florence.scale,
    {
      x: 1,
      y: 1,
      z: 1,
      duration: 1.5
    },
    '<'
  )

  .to(
    florenceRoot.position,
    {
      y: -1.12,
      z: -0.7,
      duration: 1.6
    },
    '<'
  )

  .to(
    camera.position,
    {
      x: 0.45,
      y: 0.15,
      z: 7,
      duration: 1.6
    },
    '<'
  )

/* ---------------------------------------------------------
   5 - CAMERA ENTERS FLORENCE
--------------------------------------------------------- */

  .to(
    camera.position,
    {
      x: -0.45,
      y: 0.35,
      z: 5.9,
      duration: 1.5
    }
  )

  .to(
    florenceRoot.rotation,
    {
      y: -0.07,
      duration: 1.5
    },
    '<'
  )

  .to(
    martin.group.position,
    {
      x: -0.15,
      y: 1.9,
      z: 0.2,
      duration: 1.4
    },
    '<'
  )

  .to(
    simona.group.position,
    {
      x: 0.15,
      y: 1.72,
      z: 0.2,
      duration: 1.4
    },
    '<'
  )

/* ---------------------------------------------------------
   6 - "POVEDALA ÁNO."
--------------------------------------------------------- */

  .to(
    [
      martin.glow,
      simona.glow
    ],

    {
      duration: 0.7
    }
  )

  .to(
    florenceGlowMaterial,
    {
      opacity: 0.58,
      duration: 0.55
    },
    '<'
  )

  .to(
    camera.position,
    {
      x: 0,
      y: 0.45,
      z: 5.35,
      duration: 1
    }
  )

/* ---------------------------------------------------------
   7 - LEAVING FLORENCE
--------------------------------------------------------- */

  .to(
    florenceMaterials,
    {
      opacity: 0.06,
      duration: 1.4
    }
  )

  .to(
    florenceGlowMaterial,
    {
      opacity: 0,
      duration: 1.2
    },
    '<'
  )

  .to(
    florenceRoot.position,
    {
      z: -4,
      y: -1.45,
      duration: 1.3
    },
    '<'
  )

  .to(
    camera.position,
    {
      x: 0,
      y: 0,
      z: 7,
      duration: 1.2
    },
    '<'
  )

/* ---------------------------------------------------------
   8 - BOTH CONTINUE TOGETHER
--------------------------------------------------------- */

  .to(
    martin.group.position,
    {
      x: -0.18,
      y: 0.08,
      z: 0,
      duration: 1
    }
  )

  .to(
    simona.group.position,
    {
      x: 0.18,
      y: -0.08,
      z: 0,
      duration: 1
    },
    '<'
  )

  .to(
    [
      martinTrail.material,
      simonaTrail.material
    ],

    {
      opacity: 0,
      duration: 0.8
    },
    '<'
  )

/* =========================================================
   RESPONSIVE
========================================================= */

function updateResponsive() {
  const mobile =
    window.innerWidth < 700

  const storyScale =
    mobile
      ? 0.75
      : 1

  martin.group.scale.setScalar(
    storyScale
  )

  simona.group.scale.setScalar(
    storyScale
  )

  florenceRoot.scale.setScalar(
    mobile
      ? 0.66
      : 1
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

  updateResponsive()
}

window.addEventListener(
  'resize',
  resize
)

updateResponsive()

/* =========================================================
   RENDER LOOP
========================================================= */

const clock =
  new THREE.Clock()

function render() {
  const time =
    clock.getElapsedTime()

  const martinPulse =
    1 +
    Math.sin(
      time * 2.1
    ) *
    0.045

  const simonaPulse =
    1 +
    Math.sin(
      time * 1.9 + 1
    ) *
    0.045

  martin.glow.scale.set(
    2.1 * martinPulse,
    2.1 * martinPulse,
    1
  )

  simona.glow.scale.set(
    2.1 * simonaPulse,
    2.1 * simonaPulse,
    1
  )

  martin.coreMaterial.opacity =
    0.82 +
    Math.sin(
      time * 3
    ) *
    0.12

  simona.coreMaterial.opacity =
    0.82 +
    Math.sin(
      time * 2.7 + 0.5
    ) *
    0.12

  starField.rotation.y =
    time * 0.002

  starField.rotation.x =
    Math.sin(
      time * 0.06
    ) *
    0.012

  florenceGlowMaterial.opacity =
    Math.max(
      0,
      florenceGlowMaterial.opacity
    )

  renderer.render(
    scene,
    camera
  )

  requestAnimationFrame(
    render
  )
}

render()