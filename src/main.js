import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './style.css'

gsap.registerPlugin(ScrollTrigger)

/* =========================================================
   ZÁKLAD
========================================================= */

const canvas =
  document.querySelector('#scene')

const isMobile =
  window.innerWidth < 700

const renderer =
  new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference:
      'high-performance'
  })

renderer.setSize(
  window.innerWidth,
  window.innerHeight
)

renderer.setPixelRatio(
  Math.min(
    window.devicePixelRatio,
    isMobile ? 1.5 : 2
  )
)

renderer.outputColorSpace =
  THREE.SRGBColorSpace

renderer.toneMapping =
  THREE.ACESFilmicToneMapping

renderer.toneMappingExposure =
  1.1

const scene =
  new THREE.Scene()

scene.fog =
  new THREE.FogExp2(
    0xa7a18d,
    isMobile
      ? 0.026
      : 0.021
  )

const camera =
  new THREE.PerspectiveCamera(
    42,
    window.innerWidth /
      window.innerHeight,
    0.1,
    150
  )

camera.position.set(
  0,
  12,
  22
)

/* =========================================================
   FARBY
========================================================= */

const COLORS = {
  grass:
    new THREE.Color(
      0x6f7653
    ),

  grassLight:
    new THREE.Color(
      0x89906a
    ),

  grassDark:
    new THREE.Color(
      0x4d553b
    ),

  earth:
    new THREE.Color(
      0x75684f
    ),

  water:
    0x718d88,

  trunk:
    0x554635,

  tree:
    0x3f5036,

  treeLight:
    0x596747,

  house:
    0xd8cbb2,

  roof:
    0x75523d,

  gold:
    0xffd99b
}

/* =========================================================
   OBLOHA
========================================================= */

const skyGeometry =
  new THREE.SphereGeometry(
    90,
    32,
    18
  )

const skyMaterial =
  new THREE.ShaderMaterial({

    side:
      THREE.BackSide,

    depthWrite:
      false,

    uniforms: {
      topColor: {
        value:
          new THREE.Color(
            0x76889b
          )
      },

      horizonColor: {
        value:
          new THREE.Color(
            0xc7b99e
          )
      },

      bottomColor: {
        value:
          new THREE.Color(
            0xe5d3b4
          )
      }
    },

    vertexShader: `
      varying float vY;

      void main() {
        vY = position.y;

        gl_Position =
          projectionMatrix *
          modelViewMatrix *
          vec4(
            position,
            1.0
          );
      }
    `,

    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;

      varying float vY;

      void main() {
        float h =
          clamp(
            (vY + 25.0) / 80.0,
            0.0,
            1.0
          );

        vec3 color;

        if (h < 0.48) {
          color =
            mix(
              bottomColor,
              horizonColor,
              h / 0.48
            );
        } else {
          color =
            mix(
              horizonColor,
              topColor,
              (h - 0.48) / 0.52
            );
        }

        gl_FragColor =
          vec4(
            color,
            1.0
          );
      }
    `
  })

const sky =
  new THREE.Mesh(
    skyGeometry,
    skyMaterial
  )

scene.add(sky)

/* =========================================================
   SVETLO
========================================================= */

const hemisphere =
  new THREE.HemisphereLight(
    0xe8deca,
    0x39412d,
    2.25
  )

scene.add(
  hemisphere
)

const sun =
  new THREE.DirectionalLight(
    0xffe0a7,
    3.4
  )

sun.position.set(
  -12,
  18,
  9
)

scene.add(
  sun
)

/* =========================================================
   SLNKO
========================================================= */

function createGlowTexture() {

  const size = 256

  const c =
    document.createElement(
      'canvas'
    )

  c.width = size
  c.height = size

  const ctx =
    c.getContext('2d')

  const g =
    ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    )

  g.addColorStop(
    0,
    'rgba(255,255,245,1)'
  )

  g.addColorStop(
    0.06,
    'rgba(255,240,190,0.95)'
  )

  g.addColorStop(
    0.25,
    'rgba(255,204,120,0.35)'
  )

  g.addColorStop(
    1,
    'rgba(255,180,80,0)'
  )

  ctx.fillStyle = g

  ctx.fillRect(
    0,
    0,
    size,
    size
  )

  const texture =
    new THREE.CanvasTexture(c)

  texture.colorSpace =
    THREE.SRGBColorSpace

  return texture
}

const glowTexture =
  createGlowTexture()

const sunSprite =
  new THREE.Sprite(
    new THREE.SpriteMaterial({
      map:
        glowTexture,

      color:
        0xffe7b5,

      transparent:
        true,

      opacity:
        0.65,

      depthWrite:
        false,

      blending:
        THREE.AdditiveBlending
    })
  )

sunSprite.position.set(
  -23,
  15,
  -32
)

sunSprite.scale.set(
  11,
  11,
  1
)

scene.add(
  sunSprite
)

/* =========================================================
   PROCEDURÁLNY TERÉN
========================================================= */

function riverZ(x) {

  return (
    Math.sin(
      x * 0.12
    ) * 2.1
    +
    Math.sin(
      x * 0.045
    ) * 1.1
  )
}

function terrainHeight(
  x,
  z
) {

  const waves =
    Math.sin(
      x * 0.17
    ) * 0.42
    +
    Math.cos(
      z * 0.24
    ) * 0.35
    +
    Math.sin(
      (
        x + z
      ) * 0.1
    ) * 0.26

  const broadHills =
    Math.sin(
      x * 0.065
    ) * 0.9
    +
    Math.cos(
      z * 0.075
    ) * 0.72

  const distanceToRiver =
    z - riverZ(x)

  const valley =
    -1.15 *
    Math.exp(
      -(
        distanceToRiver *
        distanceToRiver
      ) / 13
    )

  const edgeRise =
    (
      Math.abs(x) /
      26
    ) ** 2 *
    0.8

  return (
    waves +
    broadHills +
    valley +
    edgeRise
  )
}

const terrainGeometry =
  new THREE.PlaneGeometry(
    54,
    38,
    isMobile
      ? 70
      : 110,
    isMobile
      ? 48
      : 76
  )

terrainGeometry.rotateX(
  -Math.PI / 2
)

const terrainPositions =
  terrainGeometry
    .attributes
    .position

const terrainColors = []

for (
  let i = 0;
  i <
  terrainPositions.count;
  i++
) {

  const x =
    terrainPositions.getX(i)

  const z =
    terrainPositions.getZ(i)

  const y =
    terrainHeight(
      x,
      z
    )

  terrainPositions.setY(
    i,
    y
  )

  const riverDistance =
    Math.abs(
      z -
      riverZ(x)
    )

  let color

  if (
    riverDistance <
    2.2
  ) {

    color =
      COLORS.grassDark
        .clone()
        .lerp(
          COLORS.earth,
          0.35
        )

  } else if (
    y > 1.25
  ) {

    color =
      COLORS.grassLight
        .clone()

  } else {

    color =
      COLORS.grass
        .clone()
  }

  const variation =
    Math.sin(
      x * 1.7 +
      z * 2.1
    ) * 0.035

  color.offsetHSL(
    0,
    0,
    variation
  )

  terrainColors.push(
    color.r,
    color.g,
    color.b
  )
}

terrainGeometry.setAttribute(
  'color',
  new THREE.Float32BufferAttribute(
    terrainColors,
    3
  )
)

terrainGeometry.computeVertexNormals()

const terrainMaterial =
  new THREE.MeshStandardMaterial({
    vertexColors:
      true,

    roughness:
      1,

    metalness:
      0,

    flatShading:
      false
  })

const terrain =
  new THREE.Mesh(
    terrainGeometry,
    terrainMaterial
  )

scene.add(
  terrain
)

/* =========================================================
   RIEKA
========================================================= */

function createRiver() {

  const samples =
    isMobile
      ? 90
      : 150

  const vertices = []
  const indices = []

  const riverWidth =
    1.35

  for (
    let i = 0;
    i < samples;
    i++
  ) {

    const t =
      i /
      (
        samples - 1
      )

    const x =
      -27 +
      t * 54

    const z =
      riverZ(x)

    const nextX =
      x + 0.1

    const nextZ =
      riverZ(
        nextX
      )

    const dx =
      nextX - x

    const dz =
      nextZ - z

    const length =
      Math.sqrt(
        dx * dx +
        dz * dz
      )

    const nx =
      -dz /
      length

    const nz =
      dx /
      length

    const y =
      terrainHeight(
        x,
        z
      ) + 0.09

    vertices.push(
      x +
      nx *
      riverWidth,
      y,
      z +
      nz *
      riverWidth
    )

    vertices.push(
      x -
      nx *
      riverWidth,
      y,
      z -
      nz *
      riverWidth
    )

    if (
      i <
      samples - 1
    ) {

      const a =
        i * 2

      const b =
        a + 1

      const c =
        a + 2

      const d =
        a + 3

      indices.push(
        a,
        b,
        c,

        b,
        d,
        c
      )
    }
  }

  const geometry =
    new THREE.BufferGeometry()

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      vertices,
      3
    )
  )

  geometry.setIndex(
    indices
  )

  geometry.computeVertexNormals()

  const material =
    new THREE.MeshPhysicalMaterial({

      color:
        COLORS.water,

      roughness:
        0.28,

      metalness:
        0.05,

      transparent:
        true,

      opacity:
        0.86,

      side:
        THREE.DoubleSide
    })

  const mesh =
    new THREE.Mesh(
      geometry,
      material
    )

  scene.add(
    mesh
  )

  return mesh
}

const river =
  createRiver()

/* =========================================================
   DEDINKY
========================================================= */

function createHouse(
  x,
  z,
  rotation = 0,
  scale = 1
) {

  const group =
    new THREE.Group()

  const groundY =
    terrainHeight(
      x,
      z
    )

  const body =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.72,
        0.55,
        0.62
      ),

      new THREE.MeshStandardMaterial({
        color:
          COLORS.house,

        roughness:
          0.95
      })
    )

  body.position.y =
    0.275

  group.add(
    body
  )

  const roof =
    new THREE.Mesh(
      new THREE.ConeGeometry(
        0.58,
        0.4,
        4
      ),

      new THREE.MeshStandardMaterial({
        color:
          COLORS.roof,

        roughness:
          0.92
      })
    )

  roof.position.y =
    0.72

  roof.rotation.y =
    Math.PI / 4

  group.add(
    roof
  )

  group.position.set(
    x,
    groundY,
    z
  )

  group.rotation.y =
    rotation

  group.scale.setScalar(
    scale
  )

  scene.add(
    group
  )

  return group
}

function createVillage(
  centerX,
  centerZ,
  seedOffset
) {

  const group =
    new THREE.Group()

  for (
    let i = 0;
    i < 12;
    i++
  ) {

    const angle =
      i * 2.17 +
      seedOffset

    const radius =
      0.6 +
      (
        (i * 37) % 10
      ) * 0.16

    const x =
      centerX +
      Math.cos(
        angle
      ) *
      radius

    const z =
      centerZ +
      Math.sin(
        angle
      ) *
      radius

    const house =
      createHouse(
        x,
        z,
        angle * 0.25,
        0.78 +
        (
          i % 4
        ) * 0.06
      )

    group.add(
      house
    )
  }

  return group
}

const martinTown =
  {
    x: -10.5,
    z: -4.5
  }

const simonaTown =
  {
    x: 10.5,
    z: 4.3
  }

const meetingPoint =
  {
    x: 0,
    z: 0.3
  }

createVillage(
  martinTown.x,
  martinTown.z,
  0.8
)

createVillage(
  simonaTown.x,
  simonaTown.z,
  2.3
)

/* =========================================================
   STROMY
========================================================= */

function pseudoRandom(
  i
) {

  const x =
    Math.sin(
      i * 91.345
    ) *
    47453.5453

  return (
    x -
    Math.floor(x)
  )
}

const treeCount =
  isMobile
    ? 270
    : 620

const trunkGeometry =
  new THREE.CylinderGeometry(
    0.045,
    0.065,
    0.58,
    5
  )

const crownGeometry =
  new THREE.ConeGeometry(
    0.34,
    1.18,
    7
  )

const trunkMaterial =
  new THREE.MeshStandardMaterial({
    color:
      COLORS.trunk,

    roughness:
      1
  })

const crownMaterial =
  new THREE.MeshStandardMaterial({
    color:
      COLORS.tree,

    roughness:
      1
  })

const trunks =
  new THREE.InstancedMesh(
    trunkGeometry,
    trunkMaterial,
    treeCount
  )

const crowns =
  new THREE.InstancedMesh(
    crownGeometry,
    crownMaterial,
    treeCount
  )

const dummy =
  new THREE.Object3D()

let createdTrees = 0
let attempt = 0

while (
  createdTrees <
    treeCount &&
  attempt <
    treeCount * 6
) {

  const r1 =
    pseudoRandom(
      attempt * 3 + 2
    )

  const r2 =
    pseudoRandom(
      attempt * 3 + 7
    )

  const r3 =
    pseudoRandom(
      attempt * 3 + 11
    )

  const x =
    -25 +
    r1 * 50

  const z =
    -17 +
    r2 * 34

  const distanceRiver =
    Math.abs(
      z -
      riverZ(x)
    )

  const distanceMartin =
    Math.hypot(
      x -
      martinTown.x,

      z -
      martinTown.z
    )

  const distanceSimona =
    Math.hypot(
      x -
      simonaTown.x,

      z -
      simonaTown.z
    )

  const distanceMeeting =
    Math.hypot(
      x,
      z -
      meetingPoint.z
    )

  if (
    distanceRiver <
      1.8 ||
    distanceMartin <
      2.5 ||
    distanceSimona <
      2.5 ||
    distanceMeeting <
      1.6
  ) {

    attempt++
    continue
  }

  const y =
    terrainHeight(
      x,
      z
    )

  const scale =
    0.65 +
    r3 * 0.85

  dummy.position.set(
    x,
    y +
    0.29 * scale,
    z
  )

  dummy.rotation.y =
    r1 *
    Math.PI *
    2

  dummy.scale.set(
    scale,
    scale,
    scale
  )

  dummy.updateMatrix()

  trunks.setMatrixAt(
    createdTrees,
    dummy.matrix
  )

  dummy.position.set(
    x,
    y +
    0.92 * scale,
    z
  )

  dummy.rotation.y =
    r2 *
    Math.PI *
    2

  dummy.scale.set(
    scale,
    scale,
    scale
  )

  dummy.updateMatrix()

  crowns.setMatrixAt(
    createdTrees,
    dummy.matrix
  )

  createdTrees++
  attempt++
}

trunks.count =
  createdTrees

crowns.count =
  createdTrees

trunks.instanceMatrix.needsUpdate =
  true

crowns.instanceMatrix.needsUpdate =
  true

scene.add(
  trunks,
  crowns
)

/* =========================================================
   OBLAKY
========================================================= */

function createCloudTexture() {

  const c =
    document.createElement(
      'canvas'
    )

  c.width = 512
  c.height = 256

  const ctx =
    c.getContext('2d')

  const gradient =
    ctx.createRadialGradient(
      256,
      128,
      10,
      256,
      128,
      220
    )

  gradient.addColorStop(
    0,
    'rgba(255,250,238,0.55)'
  )

  gradient.addColorStop(
    0.45,
    'rgba(240,232,215,0.26)'
  )

  gradient.addColorStop(
    1,
    'rgba(230,220,205,0)'
  )

  ctx.fillStyle =
    gradient

  ctx.fillRect(
    0,
    0,
    512,
    256
  )

  return new THREE.CanvasTexture(c)
}

const cloudTexture =
  createCloudTexture()

const clouds =
  new THREE.Group()

scene.add(
  clouds
)

const cloudCount =
  isMobile
    ? 7
    : 13

for (
  let i = 0;
  i < cloudCount;
  i++
) {

  const material =
    new THREE.SpriteMaterial({

      map:
        cloudTexture,

      transparent:
        true,

      opacity:
        0.13 +
        pseudoRandom(
          i + 50
        ) * 0.14,

      depthWrite:
        false
    })

  const cloud =
    new THREE.Sprite(
      material
    )

  cloud.position.set(
    -25 +
    pseudoRandom(
      i * 4 + 1
    ) * 50,

    6 +
    pseudoRandom(
      i * 4 + 2
    ) * 7,

    -24 +
    pseudoRandom(
      i * 4 + 3
    ) * 30
  )

  const size =
    7 +
    pseudoRandom(
      i * 5 + 9
    ) * 10

  cloud.scale.set(
    size,
    size * 0.42,
    1
  )

  clouds.add(
    cloud
  )
}

/* =========================================================
   SVETELNÉ BODY
========================================================= */

function createStoryLight(
  color
) {

  const group =
    new THREE.Group()

  const sprite =
    new THREE.Sprite(
      new THREE.SpriteMaterial({

        map:
          glowTexture,

        color,

        transparent:
          true,

        opacity:
          0.95,

        depthWrite:
          false,

        blending:
          THREE.AdditiveBlending
      })
    )

  sprite.scale.set(
    1.6,
    1.6,
    1
  )

  group.add(
    sprite
  )

  const pointLight =
    new THREE.PointLight(
      color,
      2.8,
      5
    )

  group.add(
    pointLight
  )

  scene.add(
    group
  )

  return {
    group,
    sprite
  }
}

const martinLight =
  createStoryLight(
    0xffcb73
  )

const simonaLight =
  createStoryLight(
    0xffebba
  )

function placeLight(
  light,
  x,
  z
) {

  light.group.position.set(
    x,
    terrainHeight(
      x,
      z
    ) + 1.1,
    z
  )
}

placeLight(
  martinLight,
  martinTown.x,
  martinTown.z
)

placeLight(
  simonaLight,
  simonaTown.x,
  simonaTown.z
)

/* =========================================================
   CESTY
========================================================= */

function groundPoint(
  x,
  z,
  lift = 0.18
) {

  return new THREE.Vector3(
    x,
    terrainHeight(
      x,
      z
    ) + lift,
    z
  )
}

const martinCurve =
  new THREE.CatmullRomCurve3([
    groundPoint(
      martinTown.x,
      martinTown.z
    ),

    groundPoint(
      -7.5,
      -3.2
    ),

    groundPoint(
      -4.7,
      -1.1
    ),

    groundPoint(
      -2.1,
      0.3
    ),

    groundPoint(
      meetingPoint.x,
      meetingPoint.z
    )
  ])

const simonaCurve =
  new THREE.CatmullRomCurve3([
    groundPoint(
      simonaTown.x,
      simonaTown.z
    ),

    groundPoint(
      7.7,
      3.1
    ),

    groundPoint(
      5.1,
      1.2
    ),

    groundPoint(
      2.5,
      0.4
    ),

    groundPoint(
      meetingPoint.x,
      meetingPoint.z
    )
  ])

const togetherCurve =
  new THREE.CatmullRomCurve3([
    groundPoint(
      meetingPoint.x,
      meetingPoint.z
    ),

    groundPoint(
      2.8,
      -1.2
    ),

    groundPoint(
      5.6,
      -2.3
    ),

    groundPoint(
      8.2,
      -4.2
    ),

    groundPoint(
      11.4,
      -6.3
    )
  ])

function createTrail(
  curve,
  color
) {

  const points =
    curve.getPoints(
      160
    )

  const geometry =
    new THREE.BufferGeometry()
      .setFromPoints(
        points
      )

  geometry.setDrawRange(
    0,
    0
  )

  const material =
    new THREE.LineBasicMaterial({

      color,

      transparent:
        true,

      opacity:
        0.72,

      depthWrite:
        false,

      blending:
        THREE.AdditiveBlending
    })

  const line =
    new THREE.Line(
      geometry,
      material
    )

  scene.add(
    line
  )

  return {
    line,
    geometry,
    points
  }
}

const martinTrail =
  createTrail(
    martinCurve,
    0xffc46c
  )

const simonaTrail =
  createTrail(
    simonaCurve,
    0xffe1aa
  )

const togetherTrail =
  createTrail(
    togetherCurve,
    0xffdda0
  )

function updateTrail(
  trail,
  progress
) {

  const count =
    Math.max(
      0,
      Math.floor(
        progress *
        trail.points.length
      )
    )

  trail.geometry
    .setDrawRange(
      0,
      count
    )
}

/* =========================================================
   STRETNUTIE
========================================================= */

const meetingRingMaterial =
  new THREE.MeshBasicMaterial({

    color:
      0xffdda0,

    transparent:
      true,

    opacity:
      0,

    side:
      THREE.DoubleSide,

    depthWrite:
      false,

    blending:
      THREE.AdditiveBlending
  })

const meetingRing =
  new THREE.Mesh(

    new THREE.RingGeometry(
      0.7,
      0.74,
      64
    ),

    meetingRingMaterial
  )

meetingRing.rotation.x =
  -Math.PI / 2

meetingRing.position.copy(
  groundPoint(
    meetingPoint.x,
    meetingPoint.z,
    0.25
  )
)

meetingRing.scale.setScalar(
  0.2
)

scene.add(
  meetingRing
)

/* =========================================================
   CAMERA
========================================================= */

const cameraState = {

  x:
    0,

  y:
    12,

  z:
    22,

  tx:
    0,

  ty:
    0,

  tz:
    0
}

let pointerX = 0
let pointerY = 0

if (
  window.matchMedia(
    '(pointer: fine)'
  ).matches
) {

  window.addEventListener(
    'pointermove',
    event => {

      pointerX =
        (
          event.clientX /
          window.innerWidth -
          0.5
        )

      pointerY =
        (
          event.clientY /
          window.innerHeight -
          0.5
        )

    }
  )
}

/* =========================================================
   TEXT KAPITOLY
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
        opacity:
          0,

        y:
          34
      },

      {
        opacity:
          1,

        y:
          0,

        ease:
          'none',

        scrollTrigger: {

          trigger:
            chapter.parentElement,

          start:
            'top 72%',

          end:
            'center 52%',

          scrub:
            true
        }
      }
    )

    gsap.to(
      chapter,

      {
        opacity:
          0,

        y:
          -28,

        ease:
          'none',

        scrollTrigger: {

          trigger:
            chapter.parentElement,

          start:
            'center 42%',

          end:
            'bottom 18%',

          scrub:
            true
        }
      }
    )
  }
)

/* =========================================================
   LABELY
========================================================= */

const martinLabel =
  document.querySelector(
    '.world-label--martin'
  )

const simonaLabel =
  document.querySelector(
    '.world-label--simona'
  )

/* =========================================================
   STORY TIMELINE
========================================================= */

const martinProgress =
  { value: 0 }

const simonaProgress =
  { value: 0 }

const togetherProgress =
  { value: 0 }

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
        1.25
    }
  })

/* =========================================================
   1 — ÚVOD Z VÝŠKY
========================================================= */

story

  .to(
    cameraState,
    {
      x:
        -1,

      y:
        9.3,

      z:
        17,

      tx:
        0,

      ty:
        0.3,

      tz:
        0,

      duration:
        1
    },
    0
  )

/* =========================================================
   2 — HLOHOVEC + CÍFER
========================================================= */

  .to(
    [
      martinLabel,
      simonaLabel
    ],

    {
      opacity:
        1,

      duration:
        0.3
    },
    0.7
  )

  .to(
    cameraState,

    {
      x:
        0,

      y:
        7.2,

      z:
        13.8,

      tx:
        0,

      ty:
        0,

      tz:
        0,

      duration:
        0.9
    },
    0.85
  )

/* =========================================================
   3 — DVE CESTY
========================================================= */

  .to(
    martinProgress,

    {
      value:
        1,

      duration:
        1,

      ease:
        'none',

      onUpdate: () => {

        updateTrail(
          martinTrail,
          martinProgress.value
        )

        const point =
          martinCurve.getPoint(
            martinProgress.value
          )

        martinLight
          .group
          .position
          .copy(
            point
          )
      }
    },
    1
  )

  .to(
    simonaProgress,

    {
      value:
        1,

      duration:
        1,

      ease:
        'none',

      onUpdate: () => {

        updateTrail(
          simonaTrail,
          simonaProgress.value
        )

        const point =
          simonaCurve.getPoint(
            simonaProgress.value
          )

        simonaLight
          .group
          .position
          .copy(
            point
          )
      }
    },
    1
  )

  .to(
    [
      martinLabel,
      simonaLabel
    ],

    {
      opacity:
        0,

      duration:
        0.35
    },
    1.45
  )

  .to(
    cameraState,

    {
      x:
        -3.2,

      y:
        4.6,

      z:
        9.2,

      tx:
        -0.2,

      ty:
        0.1,

      tz:
        0.2,

      duration:
        1
    },
    1.05
  )

/* =========================================================
   4 — STRETNUTIE
========================================================= */

  .to(
    meetingRingMaterial,

    {
      opacity:
        0.9,

      duration:
        0.16
    },
    1.92
  )

  .to(
    meetingRing.scale,

    {
      x:
        2.5,

      y:
        2.5,

      z:
        2.5,

      duration:
        0.5
    },
    1.92
  )

  .to(
    meetingRingMaterial,

    {
      opacity:
        0,

      duration:
        0.5
    },
    2.05
  )

  .to(
    cameraState,

    {
      x:
        -1.6,

      y:
        3.1,

      z:
        6.5,

      tx:
        0,

      ty:
        0.3,

      tz:
        0.3,

      duration:
        0.75
    },
    1.82
  )

/* =========================================================
   5 — SPOLOČNÁ CESTA
========================================================= */

  .to(
    togetherProgress,

    {
      value:
        1,

      duration:
        1.35,

      ease:
        'none',

      onUpdate: () => {

        const progress =
          togetherProgress.value

        updateTrail(
          togetherTrail,
          progress
        )

        const martinPoint =
          togetherCurve.getPoint(
            progress
          )

        const simonaPoint =
          togetherCurve.getPoint(
            Math.max(
              0,
              progress -
              0.035
            )
          )

        martinLight
          .group
          .position
          .copy(
            martinPoint
          )

        simonaLight
          .group
          .position
          .copy(
            simonaPoint
          )
      }
    },
    2.45
  )

  .to(
    cameraState,

    {
      x:
        3.6,

      y:
        3.3,

      z:
        5.8,

      tx:
        5.2,

      ty:
        0.2,

      tz:
        -2.2,

      duration:
        0.7
    },
    2.4
  )

  .to(
    cameraState,

    {
      x:
        7.2,

      y:
        2.9,

      z:
        1.5,

      tx:
        9.5,

      ty:
        0.1,

      tz:
        -5,

      duration:
        0.85
    },
    3.05
  )

  .to(
    cameraState,

    {
      x:
        10.1,

      y:
        3.6,

      z:
        -3.6,

      tx:
        12,

      ty:
        1.1,

      tz:
        -8,

      duration:
        0.85
    },
    3.55
  )

/* =========================================================
   RENDER
========================================================= */

const clock =
  new THREE.Clock()

function render() {

  const time =
    clock.getElapsedTime()

  /* jemné dýchanie hviezd */

  const pulseA =
    1 +
    Math.sin(
      time * 2.1
    ) * 0.08

  const pulseB =
    1 +
    Math.sin(
      time * 1.85 + 1
    ) * 0.08

  martinLight
    .sprite
    .scale
    .set(
      1.6 * pulseA,
      1.6 * pulseA,
      1
    )

  simonaLight
    .sprite
    .scale
    .set(
      1.6 * pulseB,
      1.6 * pulseB,
      1
    )

  /* rieka */

  river.material.opacity =
    0.82 +
    Math.sin(
      time * 0.7
    ) * 0.025

  /* oblaky */

  clouds.children.forEach(
    (
      cloud,
      index
    ) => {

      cloud.position.x +=
        0.0008 *
        (
          index % 3 + 1
        )

      cloud.position.y +=
        Math.sin(
          time * 0.08 +
          index
        ) * 0.0003
    }
  )

  /* kamera */

  camera.position.set(

    cameraState.x +
    pointerX * 0.22,

    cameraState.y -
    pointerY * 0.12,

    cameraState.z +
    pointerX * 0.08
  )

  camera.lookAt(

    cameraState.tx +
    pointerX * 0.08,

    cameraState.ty -
    pointerY * 0.05,

    cameraState.tz
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

/* =========================================================
   RESIZE
========================================================= */

function resize() {

  camera.aspect =
    window.innerWidth /
    window.innerHeight

  camera
    .updateProjectionMatrix()

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  )

  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio,
      window.innerWidth < 700
        ? 1.5
        : 2
    )
  )

  ScrollTrigger.refresh()
}

window.addEventListener(
  'resize',
  resize
)