import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './style.css'

gsap.registerPlugin(ScrollTrigger)

/* =========================================================
   SETUP
========================================================= */

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
renderer.toneMappingExposure = 1.08

const scene = new THREE.Scene()

scene.fog = new THREE.FogExp2(
  0x080706,
  0.018
)

const camera = new THREE.PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.1,
  100
)

camera.position.set(
  0,
  0.2,
  10.5
)

/* =========================================================
   LIGHTS
========================================================= */

scene.add(
  new THREE.AmbientLight(
    0xffead5,
    0.24
  )
)

const cityLight = new THREE.PointLight(
  0xffa85a,
  22,
  18
)

cityLight.position.set(
  -1,
  1.2,
  4
)

scene.add(cityLight)

const moonLight = new THREE.DirectionalLight(
  0xd7d9df,
  0.45
)

moonLight.position.set(
  3,
  5,
  4
)

scene.add(moonLight)

/* =========================================================
   BACKGROUND STAR FIELD
========================================================= */

const backgroundStarCount =
  window.innerWidth < 700
    ? 420
    : 700

const backgroundPositions =
  new Float32Array(
    backgroundStarCount * 3
  )

for (
  let i = 0;
  i < backgroundStarCount;
  i++
) {
  backgroundPositions[i * 3] =
    (Math.random() - 0.5) * 30

  backgroundPositions[i * 3 + 1] =
    (Math.random() - 0.5) * 18

  backgroundPositions[i * 3 + 2] =
    -Math.random() * 18
}

const backgroundGeometry =
  new THREE.BufferGeometry()

backgroundGeometry.setAttribute(
  'position',
  new THREE.BufferAttribute(
    backgroundPositions,
    3
  )
)

const backgroundMaterial =
  new THREE.PointsMaterial({
    color: 0xf5d9ae,
    size: 0.018,
    transparent: true,
    opacity: 0.4,
    depthWrite: false
  })

const backgroundStars =
  new THREE.Points(
    backgroundGeometry,
    backgroundMaterial
  )

scene.add(backgroundStars)

/* =========================================================
   REALISTIC STAR SPRITE
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

  const gradient =
    ctx.createRadialGradient(
      center,
      center,
      0,
      center,
      center,
      center
    )

  gradient.addColorStop(
    0,
    'rgba(255,255,255,1)'
  )

  gradient.addColorStop(
    0.018,
    'rgba(255,255,248,1)'
  )

  gradient.addColorStop(
    0.055,
    'rgba(255,238,205,0.92)'
  )

  gradient.addColorStop(
    0.15,
    'rgba(255,196,125,0.38)'
  )

  gradient.addColorStop(
    0.34,
    'rgba(255,167,86,0.09)'
  )

  gradient.addColorStop(
    1,
    'rgba(255,140,60,0)'
  )

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

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
    0.495,
    'rgba(255,240,215,0)'
  )

  horizontal.addColorStop(
    0.5,
    'rgba(255,255,255,0.65)'
  )

  horizontal.addColorStop(
    0.505,
    'rgba(255,240,215,0)'
  )

  horizontal.addColorStop(
    1,
    'rgba(255,255,255,0)'
  )

  ctx.fillStyle = horizontal

  ctx.fillRect(
    0,
    center - 0.8,
    size,
    1.6
  )

  return new THREE.CanvasTexture(c)
}

const starTexture =
  createStarTexture()

/* =========================================================
   LABEL
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

  ctx.textAlign = 'center'

  ctx.fillStyle =
    'rgba(225,200,164,0.8)'

  ctx.font =
    '300 30px Arial'

  ctx.fillText(
    place.toUpperCase(),
    512,
    112
  )

  ctx.fillStyle =
    'rgba(255,246,234,0.5)'

  ctx.font =
    '300 23px Arial'

  ctx.fillText(
    name,
    512,
    158
  )

  const texture =
    new THREE.CanvasTexture(c)

  texture.colorSpace =
    THREE.SRGBColorSpace

  return texture
}

/* =========================================================
   STORY STAR
========================================================= */

function createStoryStar(
  place,
  name,
  tint
) {
  const group =
    new THREE.Group()

  const glowMaterial =
    new THREE.SpriteMaterial({
      map: starTexture,
      color: tint,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      blending:
        THREE.AdditiveBlending
    })

  const glow =
    new THREE.Sprite(
      glowMaterial
    )

  glow.scale.set(
    1.25,
    1.25,
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
    0.24,
    0.24,
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
      opacity: 0.75,
      depthWrite: false
    })

  const label =
    new THREE.Sprite(
      labelMaterial
    )

  label.scale.set(
    2.55,
    0.7,
    1
  )

  label.position.y =
    -0.8

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
   MARTIN + SIMONA
========================================================= */

const isMobile =
  window.innerWidth < 700

const startSpread =
  isMobile
    ? 1.35
    : 3.5

const martin =
  createStoryStar(
    'Hlohovec',
    'Martin',
    0xffc674
  )

martin.group.position.set(
  -startSpread,
  0.55,
  0
)

scene.add(
  martin.group
)

const simona =
  createStoryStar(
    'Cífer',
    'Simona',
    0xffe7c4
  )

simona.group.position.set(
  startSpread,
  -0.45,
  -0.1
)

scene.add(
  simona.group
)

/* =========================================================
   FLORENCE ROOT
========================================================= */

const florenceRoot =
  new THREE.Group()

florenceRoot.position.set(
  0,
  -0.95,
  -1.4
)

scene.add(
  florenceRoot
)

/* =========================================================
   SKY / HORIZON GLOW
========================================================= */

function createHorizonTexture() {
  const c =
    document.createElement('canvas')

  c.width = 1024
  c.height = 512

  const ctx =
    c.getContext('2d')

  const gradient =
    ctx.createRadialGradient(
      512,
      390,
      0,
      512,
      390,
      470
    )

  gradient.addColorStop(
    0,
    'rgba(205,123,58,0.42)'
  )

  gradient.addColorStop(
    0.25,
    'rgba(158,84,38,0.2)'
  )

  gradient.addColorStop(
    0.58,
    'rgba(78,43,28,0.08)'
  )

  gradient.addColorStop(
    1,
    'rgba(10,8,7,0)'
  )

  ctx.fillStyle = gradient

  ctx.fillRect(
    0,
    0,
    c.width,
    c.height
  )

  return new THREE.CanvasTexture(c)
}

const horizonMaterial =
  new THREE.SpriteMaterial({
    map: createHorizonTexture(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending:
      THREE.AdditiveBlending
  })

const horizonGlow =
  new THREE.Sprite(
    horizonMaterial
  )

horizonGlow.scale.set(
  12,
  6,
  1
)

horizonGlow.position.set(
  0,
  1,
  -3.2
)

florenceRoot.add(
  horizonGlow
)

/* =========================================================
   MATERIAL COLLECTIONS
========================================================= */

const cityMaterials = []
const edgeMaterials = []
const lightMaterials = []

function makeCityMaterial(
  color,
  opacity = 0
) {
  const material =
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.96,
      metalness: 0,
      transparent: true,
      opacity,
      side: THREE.DoubleSide
    })

  cityMaterials.push(material)

  return material
}

function makeEdgeMaterial(
  opacity = 0
) {
  const material =
    new THREE.LineBasicMaterial({
      color: 0xa57449,
      transparent: true,
      opacity
    })

  edgeMaterials.push(material)

  return material
}

/* =========================================================
   BUILDING SHAPE
========================================================= */

function createBuilding({
  x,
  y,
  width,
  height,
  roof = 'flat',
  z = 0,
  color = 0x14110f,
  outline = true
}) {
  const shape =
    new THREE.Shape()

  if (roof === 'gable') {
    shape.moveTo(
      -width / 2,
      0
    )

    shape.lineTo(
      width / 2,
      0
    )

    shape.lineTo(
      width / 2,
      height * 0.76
    )

    shape.lineTo(
      0,
      height
    )

    shape.lineTo(
      -width / 2,
      height * 0.76
    )

    shape.closePath()
  } else {
    shape.moveTo(
      -width / 2,
      0
    )

    shape.lineTo(
      width / 2,
      0
    )

    shape.lineTo(
      width / 2,
      height
    )

    shape.lineTo(
      -width / 2,
      height
    )

    shape.closePath()
  }

  const geometry =
    new THREE.ShapeGeometry(shape)

  const mesh =
    new THREE.Mesh(
      geometry,
      makeCityMaterial(color)
    )

  mesh.position.set(
    x,
    y,
    z
  )

  florenceRoot.add(mesh)

  if (outline) {
    const edges =
      new THREE.EdgesGeometry(
        geometry
      )

    const line =
      new THREE.LineSegments(
        edges,
        makeEdgeMaterial()
      )

    line.position.copy(
      mesh.position
    )

    florenceRoot.add(line)
  }

  return mesh
}

/* =========================================================
   FAR CITY LAYER
========================================================= */

const farLayer =
  new THREE.Group()

florenceRoot.add(
  farLayer
)

const farBuildings = [
  [-5.2, 0.0, 1.4, 1.25, 'gable'],
  [-4.1, 0.0, 1.0, 1.5, 'flat'],
  [-3.2, 0.0, 1.15, 1.25, 'gable'],
  [-2.3, 0.0, 1.0, 1.55, 'flat'],
  [-1.35, 0.0, 0.9, 1.28, 'gable'],
  [1.4, 0.0, 1.0, 1.36, 'gable'],
  [2.4, 0.0, 1.15, 1.55, 'flat'],
  [3.45, 0.0, 1.05, 1.25, 'gable'],
  [4.5, 0.0, 1.1, 1.5, 'flat'],
  [5.45, 0.0, 1.25, 1.2, 'gable']
]

farBuildings.forEach(
  ([
    x,
    y,
    width,
    height,
    roof
  ]) => {
    const mesh =
      createBuilding({
        x,
        y,
        width,
        height,
        roof,
        z: -1.9,
        color: 0x100e0d,
        outline: false
      })

    farLayer.add(mesh)
  }
)

/* =========================================================
   MID CITY LAYER
========================================================= */

const middleBuildings = [
  [-4.5, -0.15, 1.25, 1.6, 'gable'],
  [-3.45, -0.15, 0.95, 1.3, 'flat'],
  [-2.5, -0.15, 1.1, 1.55, 'gable'],
  [-1.55, -0.15, 0.8, 1.1, 'flat'],
  [1.65, -0.15, 0.9, 1.2, 'gable'],
  [2.55, -0.15, 1.0, 1.5, 'flat'],
  [3.55, -0.15, 1.2, 1.32, 'gable'],
  [4.65, -0.15, 1.1, 1.58, 'flat']
]

middleBuildings.forEach(
  ([
    x,
    y,
    width,
    height,
    roof
  ]) => {
    createBuilding({
      x,
      y,
      width,
      height,
      roof,
      z: -1,
      color: 0x181310
    })
  }
)

/* =========================================================
   FOREGROUND ROOFS
========================================================= */

const foregroundBuildings = [
  [-4.7, -0.62, 1.5, 1.35, 'flat'],
  [-3.35, -0.62, 1.3, 1.15, 'gable'],
  [-2.15, -0.62, 1.25, 1.45, 'flat'],
  [2.2, -0.62, 1.4, 1.35, 'gable'],
  [3.5, -0.62, 1.35, 1.5, 'flat'],
  [4.85, -0.62, 1.5, 1.25, 'gable']
]

foregroundBuildings.forEach(
  ([
    x,
    y,
    width,
    height,
    roof
  ]) => {
    createBuilding({
      x,
      y,
      width,
      height,
      roof,
      z: -0.15,
      color: 0x0d0b0a
    })
  }
)

/* =========================================================
   DUOMO
========================================================= */

const duomo =
  new THREE.Group()

duomo.position.set(
  -0.15,
  0.15,
  -0.35
)

florenceRoot.add(
  duomo
)

/* cathedral body */

const cathedralShape =
  new THREE.Shape()

cathedralShape.moveTo(
  -1.15,
  0
)

cathedralShape.lineTo(
  1.15,
  0
)

cathedralShape.lineTo(
  1.15,
  1.05
)

cathedralShape.lineTo(
  0.68,
  1.05
)

cathedralShape.lineTo(
  0,
  1.38
)

cathedralShape.lineTo(
  -0.68,
  1.05
)

cathedralShape.lineTo(
  -1.15,
  1.05
)

cathedralShape.closePath()

const cathedralGeometry =
  new THREE.ShapeGeometry(
    cathedralShape
  )

const cathedral =
  new THREE.Mesh(
    cathedralGeometry,
    makeCityMaterial(
      0x211813
    )
  )

duomo.add(cathedral)

const cathedralEdges =
  new THREE.LineSegments(
    new THREE.EdgesGeometry(
      cathedralGeometry
    ),
    makeEdgeMaterial()
  )

duomo.add(
  cathedralEdges
)

/* drum */

const drum =
  new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.72,
      0.72,
      0.48,
      48
    ),
    makeCityMaterial(
      0x261a14
    )
  )

drum.rotation.x =
  Math.PI / 2

drum.position.set(
  0,
  1.52,
  0
)

duomo.add(drum)

/* dome */

const domeRadius =
  0.95

const dome =
  new THREE.Mesh(
    new THREE.SphereGeometry(
      domeRadius,
      64,
      32,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    ),
    makeCityMaterial(
      0x563022
    )
  )

dome.position.set(
  0,
  1.72,
  0
)

dome.scale.y =
  1.28

duomo.add(dome)

/* dome ribs */

for (
  let rib = 0;
  rib < 8;
  rib++
) {
  const angle =
    (rib / 8) *
    Math.PI * 2

  const points = []

  for (
    let i = 0;
    i <= 28;
    i++
  ) {
    const phi =
      (i / 28) *
      (Math.PI / 2)

    const x =
      domeRadius *
      Math.sin(phi) *
      Math.cos(angle)

    const y =
      domeRadius *
      Math.cos(phi) *
      1.28

    const z =
      domeRadius *
      Math.sin(phi) *
      Math.sin(angle)

    points.push(
      new THREE.Vector3(
        x,
        y,
        z
      )
    )
  }

  const ribGeometry =
    new THREE.BufferGeometry()
      .setFromPoints(points)

  const ribMaterial =
    new THREE.LineBasicMaterial({
      color: 0xb77645,
      transparent: true,
      opacity: 0
    })

  edgeMaterials.push(
    ribMaterial
  )

  const ribLine =
    new THREE.Line(
      ribGeometry,
      ribMaterial
    )

  ribLine.position.copy(
    dome.position
  )

  duomo.add(
    ribLine
  )
}

/* lantern */

const lantern =
  new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.13,
      0.18,
      0.3,
      16
    ),
    makeCityMaterial(
      0x2b2019
    )
  )

lantern.position.set(
  0,
  2.94,
  0
)

duomo.add(lantern)

const lanternRoof =
  new THREE.Mesh(
    new THREE.ConeGeometry(
      0.14,
      0.24,
      16
    ),
    makeCityMaterial(
      0x8f603b
    )
  )

lanternRoof.position.set(
  0,
  3.2,
  0
)

duomo.add(
  lanternRoof
)

/* =========================================================
   GIOTTO TOWER
========================================================= */

const tower =
  new THREE.Group()

tower.position.set(
  1.4,
  0.15,
  -0.22
)

florenceRoot.add(
  tower
)

const towerBody =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      0.48,
      2.9,
      0.42
    ),
    makeCityMaterial(
      0x201915
    )
  )

towerBody.position.y =
  1.45

tower.add(
  towerBody
)

const towerEdges =
  new THREE.LineSegments(
    new THREE.EdgesGeometry(
      towerBody.geometry
    ),
    makeEdgeMaterial()
  )

towerEdges.position.copy(
  towerBody.position
)

tower.add(
  towerEdges
)

for (
  let i = 0;
  i < 4;
  i++
) {
  const ledge =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.58,
        0.065,
        0.5
      ),
      makeCityMaterial(
        0x60452f
      )
    )

  ledge.position.y =
    0.55 + i * 0.65

  tower.add(ledge)
}

const towerRoof =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      0.6,
      0.13,
      0.53
    ),
    makeCityMaterial(
      0x8f6844
    )
  )

towerRoof.position.y =
  2.94

tower.add(
  towerRoof
)

/* =========================================================
   WINDOWS
========================================================= */

function seededValue(i) {
  const x =
    Math.sin(
      i * 91.17
    ) * 43758.5453

  return x -
    Math.floor(x)
}

const windowMaterial =
  new THREE.MeshBasicMaterial({
    color: 0xffb96a,
    transparent: true,
    opacity: 0
  })

lightMaterials.push(
  windowMaterial
)

for (
  let i = 0;
  i < 38;
  i++
) {
  const x =
    -4.7 +
    seededValue(i) *
      9.4

  const y =
    -0.18 +
    seededValue(i + 40) *
      1.05

  const windowLight =
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        0.035,
        0.055
      ),
      windowMaterial
    )

  windowLight.position.set(
    x,
    y,
    -0.05
  )

  florenceRoot.add(
    windowLight
  )
}

/* =========================================================
   CITY HAZE
========================================================= */

function createMistTexture() {
  const c =
    document.createElement('canvas')

  c.width = 512
  c.height = 256

  const ctx =
    c.getContext('2d')

  const gradient =
    ctx.createRadialGradient(
      256,
      128,
      0,
      256,
      128,
      250
    )

  gradient.addColorStop(
    0,
    'rgba(214,154,100,0.16)'
  )

  gradient.addColorStop(
    0.45,
    'rgba(153,97,61,0.08)'
  )

  gradient.addColorStop(
    1,
    'rgba(20,15,12,0)'
  )

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 512, 256)

  return new THREE.CanvasTexture(c)
}

const mistMaterial =
  new THREE.SpriteMaterial({
    map: createMistTexture(),
    transparent: true,
    opacity: 0,
    depthWrite: false
  })

const mist =
  new THREE.Sprite(
    mistMaterial
  )

mist.scale.set(
  11,
  4.2,
  1
)

mist.position.set(
  0,
  0.8,
  -1.5
)

florenceRoot.add(
  mist
)

/* =========================================================
   INITIAL FLORENCE STATE
========================================================= */

const florenceBaseScale =
  isMobile
    ? 0.38
    : 0.72

florenceRoot.scale.setScalar(
  florenceBaseScale
)

/* =========================================================
   HTML CHAPTER ANIMATION
========================================================= */

const chapters =
  gsap.utils.toArray(
    '.chapter__inner'
  )

chapters.forEach(
  chapter => {
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
   1 — TWO SEPARATE LIVES
--------------------------------------------------------- */

story

  .to(
    martin.group.position,
    {
      x:
        isMobile
          ? -1.0
          : -2.6,

      y: 0.42,

      duration: 1.2
    }
  )

  .to(
    simona.group.position,
    {
      x:
        isMobile
          ? 1.0
          : 2.6,

      y: -0.32,

      duration: 1.2
    },
    '<'
  )

/* ---------------------------------------------------------
   2 — THEIR PATHS APPROACH
--------------------------------------------------------- */

  .to(
    martin.group.position,
    {
      x: -0.56,
      y: 0.17,
      z: 0.15,

      duration: 1.2
    }
  )

  .to(
    simona.group.position,
    {
      x: 0.56,
      y: -0.13,
      z: 0.15,

      duration: 1.2
    },
    '<'
  )

  .to(
    camera.position,
    {
      z: 9.2,
      duration: 1.1
    },
    '<'
  )

/* ---------------------------------------------------------
   3 — MEETING
--------------------------------------------------------- */

  .to(
    martin.group.position,
    {
      x: -0.18,
      y: 0.08,
      z: 0.25,

      duration: 1.15
    }
  )

  .to(
    simona.group.position,
    {
      x: 0.18,
      y: -0.08,
      z: 0.25,

      duration: 1.15
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
      duration: 0.5
    },
    '<'
  )

/* ---------------------------------------------------------
   4 — WARM LIGHT APPEARS
--------------------------------------------------------- */

  .to(
    horizonMaterial,
    {
      opacity: 0.48,
      duration: 1
    }
  )

  .to(
    mistMaterial,
    {
      opacity: 0.35,
      duration: 1
    },
    '<'
  )

/* ---------------------------------------------------------
   5 — FLORENCE EMERGES FROM DARKNESS
--------------------------------------------------------- */

  .to(
    cityMaterials,
    {
      opacity: 0.94,
      duration: 1.5
    },
    '<'
  )

  .to(
    edgeMaterials,
    {
      opacity: 0.3,
      duration: 1.5
    },
    '<'
  )

  .to(
    lightMaterials,
    {
      opacity: 0.55,
      duration: 1.4
    },
    '<'
  )

  .to(
    florenceRoot.position,
    {
      y: -0.72,
      z: -0.55,

      duration: 1.5
    },
    '<'
  )

  .to(
    camera.position,
    {
      z: 7.1,
      y: 0.15,

      duration: 1.5
    },
    '<'
  )

/* ---------------------------------------------------------
   6 — STARS MOVE TOGETHER ABOVE FLORENCE
--------------------------------------------------------- */

  .to(
    martin.group.position,
    {
      x: -0.15,
      y: 1.65,
      z: 0.35,

      duration: 1.25
    }
  )

  .to(
    simona.group.position,
    {
      x: 0.15,
      y: 1.52,
      z: 0.35,

      duration: 1.25
    },
    '<'
  )

  .to(
    camera.position,
    {
      x: 0.16,
      y: 0.32,
      z: 5.9,

      duration: 1.35
    },
    '<'
  )

/* ---------------------------------------------------------
   7 — CAMERA GLIDES THROUGH FLORENCE
--------------------------------------------------------- */

  .to(
    florenceRoot.position,
    {
      x: -0.1,
      y: -0.58,
      z: -0.15,

      duration: 1.35
    }
  )

  .to(
    camera.position,
    {
      x: -0.16,
      y: 0.42,
      z: 5.1,

      duration: 1.35
    },
    '<'
  )

  .to(
    farLayer.position,
    {
      x: 0.18,
      duration: 1.35
    },
    '<'
  )

/* ---------------------------------------------------------
   8 — "POVEDALA ÁNO."
--------------------------------------------------------- */

  .to(
    horizonMaterial,
    {
      opacity: 0.66,
      duration: 0.55
    }
  )

  .to(
    windowMaterial,
    {
      opacity: 0.78,
      duration: 0.55
    },
    '<'
  )

  .to(
    martin.glowMaterial,
    {
      opacity: 1,
      duration: 0.45
    },
    '<'
  )

  .to(
    simona.glowMaterial,
    {
      opacity: 1,
      duration: 0.45
    },
    '<'
  )

  .to(
    camera.position,
    {
      x: 0,
      y: 0.48,
      z: 4.8,

      duration: 1
    }
  )

/* ---------------------------------------------------------
   9 — FLORENCE FADES AWAY
--------------------------------------------------------- */

  .to(
    cityMaterials,
    {
      opacity: 0.05,
      duration: 1.35
    }
  )

  .to(
    edgeMaterials,
    {
      opacity: 0,
      duration: 1.1
    },
    '<'
  )

  .to(
    windowMaterial,
    {
      opacity: 0,
      duration: 1
    },
    '<'
  )

  .to(
    horizonMaterial,
    {
      opacity: 0,
      duration: 1.1
    },
    '<'
  )

  .to(
    mistMaterial,
    {
      opacity: 0,
      duration: 1.1
    },
    '<'
  )

/* ---------------------------------------------------------
   10 — THEY CONTINUE TOGETHER
--------------------------------------------------------- */

  .to(
    martin.group.position,
    {
      x: -0.13,
      y: 0.08,
      z: 0,

      duration: 1
    }
  )

  .to(
    simona.group.position,
    {
      x: 0.13,
      y: -0.08,
      z: 0,

      duration: 1
    },
    '<'
  )

  .to(
    camera.position,
    {
      x: 0,
      y: 0,
      z: 7,

      duration: 1
    },
    '<'
  )

/* =========================================================
   RESIZE
========================================================= */

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

/* =========================================================
   RENDER LOOP
========================================================= */

const clock =
  new THREE.Clock()

function render() {
  const t =
    clock.getElapsedTime()

  const martinPulse =
    1 +
    Math.sin(
      t * 2
    ) * 0.035

  const simonaPulse =
    1 +
    Math.sin(
      t * 1.85 + 0.8
    ) * 0.035

  martin.glow.scale.set(
    1.25 * martinPulse,
    1.25 * martinPulse,
    1
  )

  simona.glow.scale.set(
    1.25 * simonaPulse,
    1.25 * simonaPulse,
    1
  )

  martin.coreMaterial.opacity =
    0.86 +
    Math.sin(
      t * 2.7
    ) * 0.09

  simona.coreMaterial.opacity =
    0.86 +
    Math.sin(
      t * 2.5 + 1
    ) * 0.09

  backgroundStars.rotation.y =
    t * 0.0015

  backgroundStars.rotation.x =
    Math.sin(
      t * 0.045
    ) * 0.01

  mist.position.x =
    Math.sin(
      t * 0.09
    ) * 0.25

  horizonGlow.scale.x =
    12 +
    Math.sin(
      t * 0.08
    ) * 0.25

  renderer.render(
    scene,
    camera
  )

  requestAnimationFrame(
    render
  )
}

render()