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
  0x080706,
  0.025
)

const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.1,
  100
)

camera.position.set(
  0,
  0,
  11
)

/* --------------------------------------------------
   LIGHT
-------------------------------------------------- */

scene.add(
  new THREE.AmbientLight(
    0xfff0da,
    0.22
  )
)

/* --------------------------------------------------
   STAR TEXTURE
-------------------------------------------------- */

function createStarTexture() {
  const size = 512

  const starCanvas =
    document.createElement('canvas')

  starCanvas.width = size
  starCanvas.height = size

  const ctx =
    starCanvas.getContext('2d')

  const center = size / 2

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
    0.025,
    'rgba(255,250,235,1)'
  )

  gradient.addColorStop(
    0.07,
    'rgba(255,228,180,0.95)'
  )

  gradient.addColorStop(
    0.16,
    'rgba(255,196,120,0.45)'
  )

  gradient.addColorStop(
    0.35,
    'rgba(255,160,90,0.12)'
  )

  gradient.addColorStop(
    1,
    'rgba(255,140,60,0)'
  )

  ctx.fillStyle = gradient

  ctx.fillRect(
    0,
    0,
    size,
    size
  )

  /* jemný krížový záblesk */

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
    'rgba(255,225,180,0.05)'
  )

  horizontal.addColorStop(
    0.5,
    'rgba(255,255,255,0.75)'
  )

  horizontal.addColorStop(
    0.52,
    'rgba(255,225,180,0.05)'
  )

  horizontal.addColorStop(
    1,
    'rgba(255,255,255,0)'
  )

  ctx.fillStyle = horizontal

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
    0.48,
    'rgba(255,225,180,0.05)'
  )

  vertical.addColorStop(
    0.5,
    'rgba(255,255,255,0.65)'
  )

  vertical.addColorStop(
    0.52,
    'rgba(255,225,180,0.05)'
  )

  vertical.addColorStop(
    1,
    'rgba(255,255,255,0)'
  )

  ctx.fillStyle = vertical

  ctx.fillRect(
    center - 1,
    0,
    2,
    size
  )

  return new THREE.CanvasTexture(
    starCanvas
  )
}

const starTexture =
  createStarTexture()

/* --------------------------------------------------
   LABEL TEXTURE
-------------------------------------------------- */

function createLabelTexture(
  top,
  bottom
) {
  const labelCanvas =
    document.createElement('canvas')

  labelCanvas.width = 1024
  labelCanvas.height = 256

  const ctx =
    labelCanvas.getContext('2d')

  ctx.clearRect(
    0,
    0,
    1024,
    256
  )

  ctx.textAlign = 'center'

  ctx.fillStyle =
    'rgba(236,214,184,0.85)'

  ctx.font =
    '300 34px Arial'

  ctx.fillText(
    top.toUpperCase(),
    512,
    105
  )

  ctx.fillStyle =
    'rgba(255,245,230,0.55)'

  ctx.font =
    '300 24px Arial'

  ctx.fillText(
    bottom,
    512,
    155
  )

  const texture =
    new THREE.CanvasTexture(
      labelCanvas
    )

  texture.colorSpace =
    THREE.SRGBColorSpace

  return texture
}

/* --------------------------------------------------
   CREATE A STAR
-------------------------------------------------- */

function createStar({
  color,
  scale,
  label,
  name
}) {
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
    scale,
    scale,
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
    scale * 0.22,
    scale * 0.22,
    1
  )

  group.add(core)

  const labelTexture =
    createLabelTexture(
      label,
      name
    )

  const labelMaterial =
    new THREE.SpriteMaterial({
      map: labelTexture,
      transparent: true,
      opacity: 0.68,
      depthWrite: false
    })

  const labelSprite =
    new THREE.Sprite(
      labelMaterial
    )

  labelSprite.scale.set(
    3.8,
    0.95,
    1
  )

  labelSprite.position.y =
    -1.05

  group.add(labelSprite)

  return {
    group,
    glow,
    core,
    glowMaterial,
    coreMaterial,
    labelMaterial
  }
}

/* --------------------------------------------------
   MARTIN / HLOHOVEC
-------------------------------------------------- */

const martinStar =
  createStar({
    color: 0xffd39a,
    scale: 2.4,
    label: 'Hlohovec',
    name: 'Martin'
  })

martinStar.group.position.set(
  -4.1,
  0.65,
  0
)

scene.add(
  martinStar.group
)

/* --------------------------------------------------
   SIMONA / CIFER
-------------------------------------------------- */

const simonaStar =
  createStar({
    color: 0xffead2,
    scale: 2.25,
    label: 'Cífer',
    name: 'Simona'
  })

simonaStar.group.position.set(
  4.1,
  -0.5,
  -0.2
)

scene.add(
  simonaStar.group
)

/* --------------------------------------------------
   BACKGROUND STAR FIELD
-------------------------------------------------- */

const starCount =
  window.innerWidth < 700
    ? 450
    : 800

const starPositions =
  new Float32Array(
    starCount * 3
  )

for (
  let i = 0;
  i < starCount;
  i++
) {
  starPositions[i * 3] =
    (Math.random() - 0.5) * 32

  starPositions[i * 3 + 1] =
    (Math.random() - 0.5) * 20

  starPositions[i * 3 + 2] =
    -Math.random() * 20
}

const starGeometry =
  new THREE.BufferGeometry()

starGeometry.setAttribute(
  'position',
  new THREE.BufferAttribute(
    starPositions,
    3
  )
)

const starFieldMaterial =
  new THREE.PointsMaterial({
    color: 0xffe6c5,
    size: 0.024,
    transparent: true,
    opacity: 0.5,
    depthWrite: false
  })

const starField =
  new THREE.Points(
    starGeometry,
    starFieldMaterial
  )

scene.add(
  starField
)

/* --------------------------------------------------
   TRAILS
-------------------------------------------------- */

function makeTrail(
  startX,
  endX,
  y,
  color
) {
  const curve =
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(
        startX,
        y,
        -0.6
      ),

      new THREE.Vector3(
        startX * 0.65,
        y * 0.45,
        -0.35
      ),

      new THREE.Vector3(
        startX * 0.3,
        y * 0.15,
        -0.1
      ),

      new THREE.Vector3(
        endX,
        0,
        0
      )
    ])

  const geometry =
    new THREE.TubeGeometry(
      curve,
      100,
      0.008,
      6,
      false
    )

  const material =
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      blending:
        THREE.AdditiveBlending,
      depthWrite: false
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
  makeTrail(
    -4.1,
    -0.12,
    0.65,
    0xd8a865
  )

const simonaTrail =
  makeTrail(
    4.1,
    0.12,
    -0.5,
    0xf0cfaa
  )

/* --------------------------------------------------
   TEXT CHAPTERS
-------------------------------------------------- */

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

/* --------------------------------------------------
   STORY
-------------------------------------------------- */

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
        1.5
    }
  })

/* hviezdy sa prebúdzajú */

story
  .to(
    martinStar.group.position,
    {
      x: -3.2,
      y: 0.45,
      duration: 1
    }
  )

  .to(
    simonaStar.group.position,
    {
      x: 3.2,
      y: -0.35,
      duration: 1
    },
    '<'
  )

  .to(
    martinTrail.material,
    {
      opacity: 0.28,
      duration: 0.7
    },
    '<'
  )

  .to(
    simonaTrail.material,
    {
      opacity: 0.28,
      duration: 0.7
    },
    '<'
  )

/* dve cesty */

  .to(
    martinStar.group.position,
    {
      x: -1.65,
      y: 0.25,
      duration: 1.1
    }
  )

  .to(
    simonaStar.group.position,
    {
      x: 1.65,
      y: -0.2,
      duration: 1.1
    },
    '<'
  )

  .to(
    camera.position,
    {
      z: 9.3,
      duration: 1
    },
    '<'
  )

/* stretnutie */

  .to(
    martinStar.group.position,
    {
      x: -0.23,
      y: 0.08,
      z: 0.05,
      duration: 1.25
    }
  )

  .to(
    simonaStar.group.position,
    {
      x: 0.23,
      y: -0.08,
      z: 0,
      duration: 1.25
    },
    '<'
  )

  .to(
    [
      martinStar.labelMaterial,
      simonaStar.labelMaterial
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
      z: 7.4,
      duration: 1.2
    },
    '<'
  )

/* spolu */

  .to(
    martinStar.group.position,
    {
      x: -0.17,
      y: 0.1,
      duration: 1
    }
  )

  .to(
    simonaStar.group.position,
    {
      x: 0.17,
      y: -0.1,
      duration: 1
    },
    '<'
  )

  .to(
    camera.position,
    {
      x: 0.7,
      y: 0.25,
      z: 6.2,
      duration: 1
    },
    '<'
  )

/* florencia */

  .to(
    martinStar.group.position,
    {
      x: -0.12,
      y: 0.05,
      z: 0.2,
      duration: 1
    }
  )

  .to(
    simonaStar.group.position,
    {
      x: 0.12,
      y: -0.05,
      z: 0.2,
      duration: 1
    },
    '<'
  )

  .to(
    camera.position,
    {
      x: -0.65,
      y: -0.15,
      z: 5.4,
      duration: 1.1
    },
    '<'
  )

/* svadba */

  .to(
    camera.position,
    {
      x: 0,
      y: 0,
      z: 4.2,
      duration: 1.2
    }
  )

  .to(
    [
      martinStar.glowMaterial,
      simonaStar.glowMaterial
    ],
    {
      opacity: 0.15,
      duration: 0.9
    }
  )

  .to(
    [
      martinStar.coreMaterial,
      simonaStar.coreMaterial
    ],
    {
      opacity: 0.15,
      duration: 0.9
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

/* --------------------------------------------------
   RESPONSIVE
-------------------------------------------------- */

function updateScale() {
  const mobile =
    window.innerWidth < 700

  const scale =
    mobile
      ? 0.72
      : 1

  martinStar.group.scale.setScalar(
    scale
  )

  simonaStar.group.scale.setScalar(
    scale
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

/* --------------------------------------------------
   RENDER LOOP
-------------------------------------------------- */

const clock =
  new THREE.Clock()

function render() {
  const time =
    clock.getElapsedTime()

  const pulseMartin =
    1 +
    Math.sin(
      time * 2.1
    ) * 0.045

  const pulseSimona =
    1 +
    Math.sin(
      time * 1.85 + 1
    ) * 0.05

  martinStar.glow.scale.set(
    2.4 * pulseMartin,
    2.4 * pulseMartin,
    1
  )

  simonaStar.glow.scale.set(
    2.25 * pulseSimona,
    2.25 * pulseSimona,
    1
  )

  martinStar.coreMaterial.opacity =
    0.82 +
    Math.sin(
      time * 3
    ) * 0.12

  simonaStar.coreMaterial.opacity =
    0.82 +
    Math.sin(
      time * 2.7 + 0.6
    ) * 0.12

  starField.rotation.y =
    time * 0.0025

  starField.rotation.x =
    Math.sin(
      time * 0.05
    ) * 0.015

  renderer.render(
    scene,
    camera
  )

  requestAnimationFrame(
    render
  )
}

render()