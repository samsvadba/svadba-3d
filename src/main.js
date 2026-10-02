import * as THREE from 'three'
import './style.css'

const BASE = import.meta.env.BASE_URL
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

/* =========================================================
   DESTINATIONS
========================================================= */

const cities = {
  hlohovec: {
    key: 'hlohovec',
    number: '01 / 07',
    title: 'Hlohovec',
    country: 'Slovensko',
    lat: 48.4317,
    lng: 17.8031,
    latLabel: '48.4317° N',
    lngLabel: '17.8031° E',
    image: '01-historic-selfie.jpeg',
    text: 'Jeden z dvoch začiatkov nášho príbehu. Miesto, odkiaľ vyrazil Martin.'
  },

  cifer: {
    key: 'cifer',
    number: '02 / 07',
    title: 'Cífer',
    country: 'Slovensko',
    lat: 48.3150,
    lng: 17.4910,
    latLabel: '48.3150° N',
    lngLabel: '17.4910° E',
    image: '08-formal-outdoor.jpeg',
    text: 'Druhý začiatok. Miesto, odkiaľ do spoločného príbehu vykročila Simona.'
  },

  london: {
    key: 'london',
    number: '03 / 07',
    title: 'London',
    country: 'United Kingdom',
    lat: 51.5074,
    lng: -0.1278,
    latLabel: '51.5074° N',
    lngLabel: '0.1278° W',
    image: '02-west-ham.jpeg',
    text: 'Futbal, mesto a ďalšia spoločná spomienka. Jedna z ciest, ktoré sú najlepšie vo dvojici.'
  },

  madeira: {
    key: 'madeira',
    number: '04 / 07',
    title: 'Madeira',
    country: 'Portugal',
    lat: 32.7607,
    lng: -16.9595,
    latLabel: '32.7607° N',
    lngLabel: '16.9595° W',
    image: '03-madeira-waterfall.jpeg',
    text: 'Hory, oceán, vodopády a chvíle, pri ktorých človek na všetko ostatné zabudne.'
  },

  liverpool: {
    key: 'liverpool',
    number: '05 / 07',
    title: 'Liverpool',
    country: 'United Kingdom',
    lat: 53.4084,
    lng: -2.9916,
    latLabel: '53.4084° N',
    lngLabel: '2.9916° W',
    image: '06-liverpool-waterfront.jpeg',
    text: 'Aj keď počasie nebolo vždy dokonalé, spoločná cesta áno.'
  },

  japan: {
    key: 'japan',
    number: '06 / 07',
    title: 'Tokyo',
    country: 'Japan',
    lat: 35.6762,
    lng: 139.6503,
    latLabel: '35.6762° N',
    lngLabel: '139.6503° E',
    image: null,
    text: 'Jedna z ciest na druhý koniec sveta. Tokyo, Japonsko — ďalšia spomienka, ktorú si chceme nechať navždy.',
    instagramUrl: 'https://www.instagram.com/reel/DN_BgiWktOJ/',
    instagramEmbedUrl: 'https://www.instagram.com/reel/DN_BgiWktOJ/embed/'
  },

  florence: {
    key: 'florence',
    number: '07 / 07',
    title: 'Firenze',
    country: 'Italia',
    lat: 43.7696,
    lng: 11.2558,
    latLabel: '43.7696° N',
    lngLabel: '11.2558° E',
    image: '07-florence-engagement.jpeg',
    text: 'Miesto, kde jedna otázka zmenila ďalšiu cestu. Florencia, 1. apríla 2026.'
  }
}

const cityOrder = [
  'hlohovec',
  'cifer',
  'london',
  'madeira',
  'liverpool',
  'japan',
  'florence'
]

/* =========================================================
   DOM
========================================================= */

const root = document.documentElement
const body = document.body

const canvas = document.querySelector('#globe-canvas')
const globeSection = document.querySelector('#globe-section')
const globeSticky = document.querySelector('.globe-sticky')
const florenceSection = document.querySelector('.florence')

const memoryCard = document.querySelector('#memory-card')
const memoryPhoto = document.querySelector('.memory-photo')
const memoryImage = document.querySelector('#memory-image')
const memoryNumber = document.querySelector('#memory-number')
const memoryCountry = document.querySelector('#memory-country')
const memoryTitle = document.querySelector('#memory-title')
const memoryText = document.querySelector('#memory-text')
const memoryLink = document.querySelector('#memory-link')
const memoryLat = document.querySelector('#memory-lat')
const memoryLng = document.querySelector('#memory-lng')
const memoryClose = document.querySelector('#memory-close')

const cityButtons = [
  ...document.querySelectorAll(
    '.city-list [data-city]'
  )
]

const mobileCityButton =
  document.querySelector(
    '#mobile-city-button'
  )

const loaderProgress =
  document.querySelector(
    '#loader-progress'
  )

const loaderPercent =
  document.querySelector(
    '#loader-percent'
  )

const referenceHero =
  document.querySelector(
    '.hero-reference'
  )

const referenceImage =
  document.querySelector(
    '.hero-reference-media img'
  )

const referenceIntro =
  document.querySelector(
    '.hero-reference-intro'
  )

const referenceStory =
  document.querySelector(
    '.hero-reference-story'
  )

const referenceExplore =
  document.querySelector(
    '.hero-reference-explore'
  )

/* =========================================================
   RUNTIME CSS
========================================================= */

const runtimeStyle =
  document.createElement(
    'style'
  )

runtimeStyle.textContent = `

.globe-section {
  background:
    #f5f4f0 !important;

  color:
    #171714 !important;
}

.globe-sticky {
  background:
    radial-gradient(
      circle at 50% 45%,
      #ffffff 0%,
      #faf9f6 48%,
      #f2f1ed 100%
    ) !important;

  color:
    #171714 !important;
}

.globe-atmosphere {
  width:
    min(58vw, 660px) !important;

  background:
    radial-gradient(
      circle,
      rgba(70,75,70,.035),
      rgba(70,75,70,.012) 50%,
      transparent 72%
    ) !important;

  filter:
    blur(26px) !important;
}

.globe-title {
  color:
    rgba(20,22,19,.022) !important;
}

.globe-instruction,
.city-list,
.city-list button,
.globe-progress,
.mobile-city-button {
  color:
    #171714 !important;
}

.globe-instruction-icon {
  border-color:
    rgba(20,22,19,.2) !important;
}

.globe-progress > div {
  background:
    rgba(20,22,19,.12) !important;
}

.globe-progress i {
  background:
    #171714 !important;
}

.memory-photo {
  position:
    relative !important;
}

.instagram-reel-wrap {
  position:
    absolute;

  inset:
    0;

  z-index:
    2;

  display:
    none;

  overflow:
    hidden;

  background:
    #fff;
}

.memory-photo.is-instagram
.instagram-reel-wrap {
  display:
    block;
}

.memory-photo.is-instagram
#memory-image {
  display:
    none !important;
}

.instagram-reel-wrap iframe {
  display:
    block;

  width:
    100%;

  height:
    100%;

  border:
    0;

  background:
    #fff;
}

.instagram-fallback {
  position:
    absolute;

  left:
    10px;

  right:
    10px;

  bottom:
    8px;

  z-index:
    5;

  display:
    flex;

  justify-content:
    center;

  pointer-events:
    none;
}

.instagram-fallback a {
  pointer-events:
    auto;

  padding:
    8px 12px;

  border:
    1px solid
    rgba(0,0,0,.14);

  background:
    rgba(255,255,255,.94);

  color:
    #11130f;

  font-size:
    7px;

  font-weight:
    600;

  letter-spacing:
    .12em;

  text-transform:
    uppercase;
}

.memory-link {
  display:
    none;

  width:
    max-content;

  margin-top:
    18px;

  padding-bottom:
    4px;

  border-bottom:
    1px solid
    rgba(17,19,15,.34);

  color:
    #11130f;

  font-size:
    8px;

  font-weight:
    600;

  letter-spacing:
    .14em;

  text-transform:
    uppercase;

  transition:
    opacity .25s ease,
    transform .25s ease;
}

.memory-link:hover {
  opacity:
    .6;

  transform:
    translateX(3px);
}

.memory-connector {
  position:
    absolute;

  inset:
    0;

  z-index:
    24;

  width:
    100%;

  height:
    100%;

  overflow:
    visible;

  pointer-events:
    none;

  opacity:
    0;

  transition:
    opacity .3s ease;
}

.memory-connector.is-visible {
  opacity:
    1;
}

.memory-connector line {
  stroke:
    rgba(20,22,19,.38);

  stroke-width:
    1;

  vector-effect:
    non-scaling-stroke;
}

.memory-connector circle {
  fill:
    #171714;
}

.globe-start-message {
  position:
    absolute;

  left:
    50%;

  bottom:
    76px;

  z-index:
    11;

  transform:
    translateX(-50%);

  white-space:
    nowrap;

  color:
    rgba(17,19,15,.48);

  font-size:
    7px;

  font-weight:
    500;

  letter-spacing:
    .2em;

  text-transform:
    uppercase;

  pointer-events:
    none;

  transition:
    opacity .3s ease;
}

@media (max-width:700px) {

  .globe-atmosphere {
    width:
      88vw !important;
  }

  .memory-connector {
    display:
      none;
  }

  .globe-start-message {
    bottom:
      118px;

    font-size:
      6px;
  }

  .memory-link {
    margin-top:
      14px;

    font-size:
      7px;
  }

}

`

document.head.appendChild(
  runtimeStyle
)

/* =========================================================
   INSTAGRAM REEL
========================================================= */

const instagramWrap =
  document.createElement(
    'div'
  )

instagramWrap.className =
  'instagram-reel-wrap'

instagramWrap.innerHTML = `

  <iframe
    id="instagram-reel-frame"
    title="Japan Instagram Reel"
    loading="lazy"
    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
    allowfullscreen
  ></iframe>

  <div
    class="instagram-fallback"
  >

    <a
      id="instagram-fallback-link"
      href="https://www.instagram.com/reel/DN_BgiWktOJ/"
      target="_blank"
      rel="noopener noreferrer"
    >
      OPEN ON INSTAGRAM ↗
    </a>

  </div>

`

memoryPhoto
  ?.appendChild(
    instagramWrap
  )

const instagramFrame =
  instagramWrap.querySelector(
    '#instagram-reel-frame'
  )

const instagramFallbackLink =
  instagramWrap.querySelector(
    '#instagram-fallback-link'
  )

/* =========================================================
   CONNECTOR
========================================================= */

const SVG_NS =
  'http://www.w3.org/2000/svg'

const connectorSvg =
  document.createElementNS(
    SVG_NS,
    'svg'
  )

connectorSvg.setAttribute(
  'class',
  'memory-connector'
)

connectorSvg.setAttribute(
  'aria-hidden',
  'true'
)

connectorSvg.innerHTML = `

  <line
    x1="0"
    y1="0"
    x2="0"
    y2="0"
  ></line>

  <circle
    cx="0"
    cy="0"
    r="3"
  ></circle>

`

globeSticky
  ?.appendChild(
    connectorSvg
  )

const connectorLine =
  connectorSvg.querySelector(
    'line'
  )

const connectorDot =
  connectorSvg.querySelector(
    'circle'
  )

/* =========================================================
   START MESSAGE
========================================================= */

const startMessage =
  document.createElement(
    'div'
  )

startMessage.className =
  'globe-start-message'

startMessage.textContent =
  'SELECT A CITY TO START'

globeSticky
  ?.appendChild(
    startMessage
  )

const instructionText =
  document.querySelector(
    '.globe-instruction p'
  )

if (
  instructionText
) {

  instructionText.innerHTML =
    `
      DRAG TO ROTATE
      <br>
      SELECT A CITY
    `

}

/* =========================================================
   LOADER
========================================================= */

const preloadFiles = [
  '01-historic-selfie.jpeg',
  '02-west-ham.jpeg',
  '03-madeira-waterfall.jpeg',
  '04-madeira-swing.jpeg',
  '06-liverpool-waterfront.jpeg',
  '07-florence-engagement.jpeg',
  '08-formal-outdoor.jpeg'
]

let loadedResources =
  0

function setLoaderProgress(
  value
) {

  const progress =
    Math.max(
      0,
      Math.min(
        value,
        100
      )
    )

  if (
    loaderProgress
  ) {

    loaderProgress.style.width =
      `${progress}%`

  }

  if (
    loaderPercent
  ) {

    loaderPercent.textContent =
      `${Math.round(progress)}%`

  }

}

function resourceLoaded() {

  loadedResources +=
    1

  setLoaderProgress(
    (
      loadedResources /
      preloadFiles.length
    ) *
    88
  )

}

function preloadImages() {

  return Promise.allSettled(

    preloadFiles.map(

      file =>

        new Promise(
          resolve => {

            const image =
              new Image()

            image.onload =
              () => {

                resourceLoaded()
                resolve()

              }

            image.onerror =
              () => {

                resourceLoaded()
                resolve()

              }

            image.src =
              `${BASE}photos/${file}`

          }
        )

    )

  )

}

function finishLoader() {

  setLoaderProgress(
    100
  )

  window.setTimeout(
    () => {

      body.classList.remove(
        'is-loading'
      )

      body.classList.add(
        'is-loaded'
      )

    },
    300
  )

}

/* =========================================================
   THREE
========================================================= */

let renderer
let scene
let camera
let worldGroup
let globeSphere

let globeVisible =
  false

let activeCity =
  null

let dragging =
  false

let dragDistance =
  0

let pointerDownX =
  0

let pointerDownY =
  0

let previousPointerX =
  0

let previousPointerY =
  0

let lastInteraction =
  performance.now()

const globeRadius =
  1.42

const targetQuaternion =
  new THREE.Quaternion()

const markerObjects =
  []

const markerHitTargets =
  []

const raycaster =
  new THREE.Raycaster()

const rayPointer =
  new THREE.Vector2()

const frontVector =
  new THREE.Vector3(
    0,
    0,
    1
  )

/* =========================================================
   COORDINATES
========================================================= */

function latLngToVector(
  lat,
  lng,
  radius = globeRadius
) {

  const phi =
    THREE.MathUtils
      .degToRad(
        90 -
        lat
      )

  const theta =
    THREE.MathUtils
      .degToRad(
        lng +
        180
      )

  return new THREE.Vector3(

    -radius *
    Math.sin(
      phi
    ) *
    Math.cos(
      theta
    ),

    radius *
    Math.cos(
      phi
    ),

    radius *
    Math.sin(
      phi
    ) *
    Math.sin(
      theta
    )

  )

}

/* =========================================================
   LIGHTS
========================================================= */

function createLights() {

  scene.add(

    new THREE.AmbientLight(
      0xffffff,
      1.8
    )

  )

  const key =
    new THREE.DirectionalLight(
      0xffffff,
      1.3
    )

  key.position.set(
    3,
    4,
    5
  )

  scene.add(
    key
  )

  const fill =
    new THREE.DirectionalLight(
      0xdfe6df,
      0.65
    )

  fill.position.set(
    -4,
    -1,
    3
  )

  scene.add(
    fill
  )

}

/* =========================================================
   GLOBE SURFACE
========================================================= */

function createGlobeSurface() {

  const geometry =
    new THREE.SphereGeometry(
      globeRadius,
      96,
      64
    )

  const material =
    new THREE.MeshPhysicalMaterial({

      color:
        0xf7f7f4,

      transparent:
        true,

      opacity:
        .36,

      roughness:
        1,

      metalness:
        0,

      depthWrite:
        true

    })

  globeSphere =
    new THREE.Mesh(
      geometry,
      material
    )

  worldGroup.add(
    globeSphere
  )

  const wireGeometry =
    new THREE.SphereGeometry(

      globeRadius *
      1.003,

      42,

      28

    )

  const wireMaterial =
    new THREE.MeshBasicMaterial({

      color:
        0x747874,

      wireframe:
        true,

      transparent:
        true,

      opacity:
        .055,

      depthWrite:
        false

    })

  worldGroup.add(

    new THREE.Mesh(
      wireGeometry,
      wireMaterial
    )

  )

}

/* =========================================================
   GLOBE DOTS
========================================================= */

function createSurfaceDots() {

  const count =
    window.innerWidth <
    700
      ? 600
      : 950

  const positions =
    new Float32Array(
      count *
      3
    )

  const goldenAngle =
    Math.PI *
    (
      3 -
      Math.sqrt(
        5
      )
    )

  for (
    let i = 0;
    i < count;
    i += 1
  ) {

    const y =
      1 -
      (
        i /
        (
          count -
          1
        )
      ) *
      2

    const radius =
      Math.sqrt(
        1 -
        y *
        y
      )

    const theta =
      goldenAngle *
      i

    const point =
      new THREE.Vector3(

        Math.cos(
          theta
        ) *
        radius,

        y,

        Math.sin(
          theta
        ) *
        radius

      )
        .normalize()
        .multiplyScalar(

          globeRadius *
          1.007

        )

    positions[
      i *
      3
    ] =
      point.x

    positions[
      i *
      3 +
      1
    ] =
      point.y

    positions[
      i *
      3 +
      2
    ] =
      point.z

  }

  const geometry =
    new THREE.BufferGeometry()

  geometry.setAttribute(

    'position',

    new THREE.BufferAttribute(
      positions,
      3
    )

  )

  const material =
    new THREE.PointsMaterial({

      color:
        0x4a4e4a,

      size:
        window.innerWidth <
        700
          ? .008
          : .006,

      transparent:
        true,

      opacity:
        .13,

      depthWrite:
        false

    })

  worldGroup.add(

    new THREE.Points(
      geometry,
      material
    )

  )

}

/* =========================================================
   GRID
========================================================= */

function createGraticule() {

  const material =
    new THREE.LineBasicMaterial({

      color:
        0x676b67,

      transparent:
        true,

      opacity:
        .085,

      depthWrite:
        false

    })

  const radius =
    globeRadius *
    1.009

  ;[
    -60,
    -30,
    0,
    30,
    60

  ].forEach(
    latitude => {

      const points =
        []

      const latRad =
        THREE.MathUtils
          .degToRad(
            latitude
          )

      const ringRadius =
        Math.cos(
          latRad
        ) *
        radius

      const y =
        Math.sin(
          latRad
        ) *
        radius

      for (
        let i = 0;
        i <= 150;
        i += 1
      ) {

        const angle =
          (
            i /
            150
          ) *
          Math.PI *
          2

        points.push(

          new THREE.Vector3(

            Math.cos(
              angle
            ) *
            ringRadius,

            y,

            Math.sin(
              angle
            ) *
            ringRadius

          )

        )

      }

      const geometry =
        new THREE.BufferGeometry()
          .setFromPoints(
            points
          )

      worldGroup.add(

        new THREE.Line(
          geometry,
          material
        )

      )

    }
  )

  for (
    let longitude = -150;
    longitude <= 180;
    longitude += 30
  ) {

    const points =
      []

    const lngRad =
      THREE.MathUtils
        .degToRad(
          longitude
        )

    for (
      let latitude = -90;
      latitude <= 90;
      latitude += 2
    ) {

      const latRad =
        THREE.MathUtils
          .degToRad(
            latitude
          )

      points.push(

        new THREE.Vector3(

          radius *
          Math.cos(
            latRad
          ) *
          Math.sin(
            lngRad
          ),

          radius *
          Math.sin(
            latRad
          ),

          radius *
          Math.cos(
            latRad
          ) *
          Math.cos(
            lngRad
          )

        )

      )

    }

    const geometry =
      new THREE.BufferGeometry()
        .setFromPoints(
          points
        )

    worldGroup.add(

      new THREE.Line(
        geometry,
        material
      )

    )

  }

}

/* =========================================================
   MARKERS
========================================================= */

function createMarkers() {

  Object.values(
    cities
  )
    .forEach(
      (
        city,
        index
      ) => {

        const position =
          latLngToVector(

            city.lat,

            city.lng,

            globeRadius *
            1.018

          )

        const group =
          new THREE.Group()

        group.position.copy(
          position
        )

        group.userData.cityKey =
          city.key

        group.userData.phase =
          index *
          .8

        const dot =
          new THREE.Mesh(

            new THREE.SphereGeometry(
              .024,
              18,
              18
            ),

            new THREE.MeshBasicMaterial({

              color:
                0x141614

            })

          )

        const ring =
          new THREE.Mesh(

            new THREE.SphereGeometry(
              .038,
              16,
              16
            ),

            new THREE.MeshBasicMaterial({

              color:
                0x141614,

              transparent:
                true,

              opacity:
                .12,

              depthWrite:
                false

            })

          )

        const hit =
          new THREE.Mesh(

            new THREE.SphereGeometry(
              .085,
              12,
              12
            ),

            new THREE.MeshBasicMaterial({

              transparent:
                true,

              opacity:
                0,

              depthWrite:
                false

            })

          )

        group.add(
          ring
        )

        group.add(
          dot
        )

        group.add(
          hit
        )

        group.userData.ring =
          ring

        hit.userData.cityKey =
          city.key

        markerObjects.push(
          group
        )

        markerHitTargets.push(
          hit
        )

        worldGroup.add(
          group
        )

      }
    )

}

/* =========================================================
   RESIZE GLOBE
========================================================= */

function resizeRenderer() {

  if (
    !renderer ||
    !camera ||
    !globeSticky
  ) {
    return
  }

  const width =
    globeSticky.clientWidth ||
    window.innerWidth

  const height =
    globeSticky.clientHeight ||
    window.innerHeight

  renderer.setPixelRatio(

    Math.min(
      window.devicePixelRatio,
      2
    )

  )

  renderer.setSize(
    width,
    height,
    false
  )

  camera.aspect =
    width /
    height

  camera.position.set(

    0,

    0,

    window.innerWidth <
    700
      ? 5.7
      : 6.65

  )

  camera.updateProjectionMatrix()

}

/* =========================================================
   FACE CITY
========================================================= */

function faceCoordinates(
  lat,
  lng,
  immediate = false
) {

  if (
    !worldGroup
  ) {
    return
  }

  const point =
    latLngToVector(
      lat,
      lng,
      1
    )
      .normalize()

  const target =
    new THREE.Quaternion()
      .setFromUnitVectors(
        point,
        frontVector
      )

  targetQuaternion.copy(
    target
  )

  if (
    immediate
  ) {

    worldGroup.quaternion.copy(
      targetQuaternion
    )

  }

}

/* =========================================================
   INSTAGRAM
========================================================= */

function stopInstagramVideo() {

  if (
    instagramFrame
  ) {

    instagramFrame.src =
      'about:blank'

  }

  memoryPhoto
    ?.classList
    .remove(
      'is-instagram'
    )

}

function showInstagramVideo(
  city
) {

  if (
    !memoryPhoto ||
    !instagramFrame
  ) {
    return
  }

  memoryPhoto
    .classList
    .add(
      'is-instagram'
    )

  instagramFrame.src =
    city.instagramEmbedUrl

  if (
    instagramFallbackLink
  ) {

    instagramFallbackLink.href =
      city.instagramUrl

  }

}

/* =========================================================
   ACTIVE BUTTONS
========================================================= */

function updateActiveButtons(
  key
) {

  cityButtons.forEach(
    button => {

      button.classList.toggle(

        'is-active',

        button.dataset.city ===
        key

      )

    }
  )

}

/* =========================================================
   OPEN MEMORY
========================================================= */

function openMemory(
  key
) {

  const city =
    cities[
      key
    ]

  if (
    !city ||
    !memoryCard
  ) {
    return
  }

  activeCity =
    key

  lastInteraction =
    performance.now()

  if (
    memoryNumber
  ) {

    memoryNumber.textContent =
      city.number

  }

  if (
    memoryCountry
  ) {

    memoryCountry.textContent =
      city.country

  }

  if (
    memoryTitle
  ) {

    memoryTitle.textContent =
      city.title

  }

  if (
    memoryText
  ) {

    memoryText.textContent =
      city.text

  }

  if (
    memoryLat
  ) {

    memoryLat.textContent =
      city.latLabel

  }

  if (
    memoryLng
  ) {

    memoryLng.textContent =
      city.lngLabel

  }

  if (
    city.instagramEmbedUrl
  ) {

    showInstagramVideo(
      city
    )

    if (
      memoryLink
    ) {

      memoryLink.href =
        city.instagramUrl

      memoryLink.style.display =
        'inline-block'

      memoryLink.textContent =
        'WATCH REEL ↗'

    }

  } else {

    stopInstagramVideo()

    if (
      memoryImage &&
      city.image
    ) {

      memoryImage.src =
        `${BASE}photos/${city.image}`

      memoryImage.alt =
        `${city.title} — Simona a Martin`

      memoryImage.style.display =
        ''

    }

    if (
      memoryLink
    ) {

      memoryLink.style.display =
        'none'

    }

  }

  memoryCard
    .classList
    .add(
      'is-open'
    )

  connectorSvg
    .classList
    .add(
      'is-visible'
    )

  startMessage.style.opacity =
    '0'

  updateActiveButtons(
    key
  )

  faceCoordinates(
    city.lat,
    city.lng
  )

  closeMobileMenu()

}

/* =========================================================
   CLOSE MEMORY
========================================================= */

function closeMemoryCard() {

  activeCity =
    null

  memoryCard
    ?.classList
    .remove(
      'is-open'
    )

  connectorSvg
    .classList
    .remove(
      'is-visible'
    )

  startMessage.style.opacity =
    '1'

  updateActiveButtons(
    null
  )

  stopInstagramVideo()

}

memoryClose
  ?.addEventListener(
    'click',
    closeMemoryCard
  )

cityButtons.forEach(
  button => {

    button.addEventListener(
      'click',
      () => {

        openMemory(
          button.dataset.city
        )

      }
    )

  }
)

/* =========================================================
   MOBILE MENU
========================================================= */

const mobileMenu =
  document.createElement(
    'div'
  )

mobileMenu.className =
  'mobile-city-menu'

mobileMenu.innerHTML =
  cityOrder
    .map(
      key => {

        const city =
          cities[
            key
          ]

        return `
          <button
            type="button"
            data-mobile-city="${key}"
          >

            <span>
              ${city.number.split(' / ')[0]}
            </span>

            <strong>
              ${city.title}
            </strong>

            <i>
              ↗
            </i>

          </button>
        `

      }
    )
    .join(
      ''
    )

globeSticky
  ?.appendChild(
    mobileMenu
  )

const mobileMenuStyle =
  document.createElement(
    'style'
  )

mobileMenuStyle.textContent = `

.mobile-city-menu {
  position:
    absolute;

  left:
    17px;

  right:
    17px;

  bottom:
    112px;

  z-index:
    40;

  display:
    none;

  max-height:
    56svh;

  overflow:
    auto;

  padding:
    8px 18px;

  background:
    rgba(247,246,242,.97);

  box-shadow:
    0 20px 70px
    rgba(20,22,19,.12);

  transform:
    translateY(22px);

  opacity:
    0;

  visibility:
    hidden;

  transition:
    opacity .3s ease,
    transform .4s
    cubic-bezier(.22,1,.36,1),
    visibility .3s ease;
}

.mobile-city-menu.is-open {
  transform:
    translateY(0);

  opacity:
    1;

  visibility:
    visible;
}

.mobile-city-menu button {
  display:
    grid;

  grid-template-columns:
    35px 1fr auto;

  align-items:
    center;

  width:
    100%;

  padding:
    15px 0;

  border-bottom:
    1px solid
    rgba(20,22,19,.1);

  color:
    #171714;

  text-align:
    left;
}

.mobile-city-menu button:last-child {
  border-bottom:
    0;
}

.mobile-city-menu span {
  font-size:
    7px;

  letter-spacing:
    .15em;

  opacity:
    .45;
}

.mobile-city-menu strong {
  font-family:
    "Cormorant Garamond",
    Georgia,
    serif;

  font-size:
    27px;

  font-weight:
    400;
}

.mobile-city-menu i {
  font-size:
    11px;

  font-style:
    normal;

  opacity:
    .5;
}

@media
(max-width:700px) {

  .mobile-city-menu {
    display:
      block;
  }

}

`

document.head.appendChild(
  mobileMenuStyle
)

/* =========================================================
   MOBILE MENU FUNCTIONS
========================================================= */

function openMobileMenu() {

  mobileMenu
    .classList
    .add(
      'is-open'
    )

  const plus =
    mobileCityButton
      ?.querySelector(
        'strong'
      )

  if (
    plus
  ) {

    plus.textContent =
      '×'

  }

}

function closeMobileMenu() {

  mobileMenu
    .classList
    .remove(
      'is-open'
    )

  const plus =
    mobileCityButton
      ?.querySelector(
        'strong'
      )

  if (
    plus
  ) {

    plus.textContent =
      '+'

  }

}

mobileCityButton
  ?.addEventListener(
    'click',
    () => {

      if (
        mobileMenu
          .classList
          .contains(
            'is-open'
          )
      ) {

        closeMobileMenu()

      } else {

        openMobileMenu()

      }

    }
  )

mobileMenu
  .querySelectorAll(
    '[data-mobile-city]'
  )
  .forEach(
    button => {

      button.addEventListener(
        'click',
        () => {

          openMemory(
            button.dataset
              .mobileCity
          )

        }
      )

    }
  )

/* =========================================================
   DRAG
========================================================= */

function onPointerDown(
  event
) {

  if (
    !globeVisible ||
    !worldGroup
  ) {
    return
  }

  dragging =
    true

  dragDistance =
    0

  pointerDownX =
    event.clientX

  pointerDownY =
    event.clientY

  previousPointerX =
    event.clientX

  previousPointerY =
    event.clientY

  lastInteraction =
    performance.now()

  canvas.style.cursor =
    'grabbing'

  try {

    canvas.setPointerCapture(
      event.pointerId
    )

  } catch {

    // Safari fallback

  }

}

function onPointerMove(
  event
) {

  if (
    !dragging ||
    !worldGroup
  ) {
    return
  }

  const deltaX =
    event.clientX -
    previousPointerX

  const deltaY =
    event.clientY -
    previousPointerY

  dragDistance +=
    Math.abs(
      deltaX
    ) +
    Math.abs(
      deltaY
    )

  previousPointerX =
    event.clientX

  previousPointerY =
    event.clientY

  const yaw =
    new THREE.Quaternion()
      .setFromAxisAngle(

        new THREE.Vector3(
          0,
          1,
          0
        ),

        deltaX *
        .0055

      )

  const pitch =
    new THREE.Quaternion()
      .setFromAxisAngle(

        new THREE.Vector3(
          1,
          0,
          0
        ),

        deltaY *
        (
          window.innerWidth <
          700
            ? .0017
            : .0038
        )

      )

  targetQuaternion
    .premultiply(
      yaw
    )

  targetQuaternion
    .premultiply(
      pitch
    )

  targetQuaternion
    .normalize()

  if (
    activeCity
  ) {

    closeMemoryCard()

  }

}

function raycastCity(
  event
) {

  if (
    !renderer ||
    !camera ||
    !canvas
  ) {
    return
  }

  const rect =
    canvas
      .getBoundingClientRect()

  rayPointer.x =
    (
      (
        event.clientX -
        rect.left
      ) /
      rect.width
    ) *
    2 -
    1

  rayPointer.y =
    -(
      (
        event.clientY -
        rect.top
      ) /
      rect.height
    ) *
    2 +
    1

  raycaster
    .setFromCamera(
      rayPointer,
      camera
    )

  const intersections =
    raycaster
      .intersectObjects(
        markerHitTargets,
        false
      )

  if (
    intersections.length >
    0
  ) {

    openMemory(

      intersections[
        0
      ]
        .object
        .userData
        .cityKey

    )

  }

}

function onPointerUp(
  event
) {

  if (
    !dragging
  ) {
    return
  }

  dragging =
    false

  canvas.style.cursor =
    'grab'

  const movement =
    Math.abs(
      event.clientX -
      pointerDownX
    ) +
    Math.abs(
      event.clientY -
      pointerDownY
    )

  if (
    movement <
    10 &&
    dragDistance <
    16
  ) {

    raycastCity(
      event
    )

  }

  lastInteraction =
    performance.now()

}

canvas
  ?.addEventListener(
    'pointerdown',
    onPointerDown
  )

canvas
  ?.addEventListener(
    'pointermove',
    onPointerMove
  )

canvas
  ?.addEventListener(
    'pointerup',
    onPointerUp
  )

canvas
  ?.addEventListener(
    'pointercancel',
    () => {

      dragging =
        false

      if (
        canvas
      ) {

        canvas.style.cursor =
          'grab'

      }

    }
  )

/* =========================================================
   CONNECTOR POSITION
========================================================= */

function getActiveMarkerWorldPosition() {

  if (
    !activeCity
  ) {
    return null
  }

  const marker =
    markerObjects.find(
      item =>
        item.userData.cityKey ===
        activeCity
    )

  if (
    !marker
  ) {
    return null
  }

  const worldPosition =
    new THREE.Vector3()

  marker.getWorldPosition(
    worldPosition
  )

  return worldPosition

}

function updateConnector() {

  if (
    !activeCity ||
    !camera ||
    !globeSticky ||
    !memoryCard
      ?.classList
      .contains(
        'is-open'
      ) ||
    window.innerWidth <
    701
  ) {

    connectorSvg
      .classList
      .remove(
        'is-visible'
      )

    return

  }

  const markerWorld =
    getActiveMarkerWorldPosition()

  if (
    !markerWorld
  ) {
    return
  }

  const projected =
    markerWorld
      .clone()
      .project(
        camera
      )

  const stickyRect =
    globeSticky
      .getBoundingClientRect()

  const cardRect =
    memoryCard
      .getBoundingClientRect()

  const markerX =
    (
      (
        projected.x +
        1
      ) /
      2
    ) *
    stickyRect.width

  const markerY =
    (
      (
        1 -
        projected.y
      ) /
      2
    ) *
    stickyRect.height

  const cardIsLeft =
    cardRect.left <
    stickyRect.left +
    markerX

  const cardX =
    cardIsLeft
      ?
        cardRect.right -
        stickyRect.left
      :
        cardRect.left -
        stickyRect.left

  const cardY =
    cardRect.top -
    stickyRect.top +
    Math.min(
      cardRect.height *
      .42,
      150
    )

  connectorLine
    ?.setAttribute(
      'x1',
      markerX
    )

  connectorLine
    ?.setAttribute(
      'y1',
      markerY
    )

  connectorLine
    ?.setAttribute(
      'x2',
      cardX
    )

  connectorLine
    ?.setAttribute(
      'y2',
      cardY
    )

  connectorDot
    ?.setAttribute(
      'cx',
      markerX
    )

  connectorDot
    ?.setAttribute(
      'cy',
      markerY
    )

  connectorSvg
    .classList
    .add(
      'is-visible'
    )

}

/* =========================================================
   NORMAL SCROLL PROGRESS
========================================================= */

function clamp(
  value,
  min = 0,
  max = 1
) {

  return Math.min(
    Math.max(
      value,
      min
    ),
    max
  )

}

function sectionProgress(
  section
) {

  if (
    !section
  ) {
    return 0
  }

  const rect =
    section
      .getBoundingClientRect()

  const distance =
    section.offsetHeight -
    window.innerHeight

  if (
    distance <=
    0
  ) {
    return 0
  }

  return clamp(
    -rect.top /
    distance
  )

}

function updateScroll() {

  const globeProgress =
    sectionProgress(
      globeSection
    )

  const florenceProgress =
    sectionProgress(
      florenceSection
    )

  root.style.setProperty(

    '--globe-progress',

    globeProgress
      .toFixed(
        4
      )

  )

  root.style.setProperty(

    '--florence-progress',

    florenceProgress
      .toFixed(
        4
      )

  )

}

window.addEventListener(

  'scroll',

  updateScroll,

  {
    passive:
      true
  }

)

/* =========================================================
   REFERENCE INTRO
========================================================= */

function referenceClamp(
  value,
  min = 0,
  max = 1
) {

  return Math.min(
    Math.max(
      value,
      min
    ),
    max
  )

}

function referenceSmoothstep(
  min,
  max,
  value
) {

  const x =
    referenceClamp(
      (
        value -
        min
      ) /
      (
        max -
        min
      )
    )

  return (
    x *
    x *
    (
      3 -
      2 *
      x
    )
  )

}
let introUnlocked = false

function getIntroLockPosition() {

  if (!referenceHero) {
    return 0
  }

  const distance =
    Math.max(
      referenceHero.offsetHeight -
      window.innerHeight,
      1
    )

  return distance * 0.72

}
function updateReferenceIntro() {

  if (
    !referenceHero
  ) {
    return
  }

  const rect =
    referenceHero
      .getBoundingClientRect()

  const scrollDistance =
    Math.max(

      referenceHero.offsetHeight -
      window.innerHeight,

      1

    )

 const lockPosition =
    getIntroLockPosition()

  if (
    !introUnlocked &&
    window.scrollY >
    lockPosition
  ) {

    window.scrollTo(
      0,
      lockPosition
    )

  }

  const progress =
    referenceClamp(

      -rect.top /
      scrollDistance

    )

  /* =======================================================
     SCENE 1
  ======================================================= */

  const introExit =
    referenceSmoothstep(
      .08,
      .34,
      progress
    )

  if (
    referenceIntro
  ) {

    if (
      progress >
      .01
    ) {

      referenceIntro.style.animation =
        'none'

    }

    referenceIntro.style.opacity =
      String(
        1 -
        introExit
      )

    referenceIntro.style.transform =
      `
        translate3d(
          0,
          ${introExit * -14}px,
          0
        )
      `

  }

  /* =======================================================
     SCENE 2
  ======================================================= */

  const storyEnter =
    referenceSmoothstep(
      .39,
      .64,
      progress
    )

  if (
    referenceStory
  ) {

    referenceStory.style.opacity =
      String(
        storyEnter
      )

    referenceStory.style.transform =
      `
        translate3d(
          0,
          ${(1 - storyEnter) * 18}px,
          0
        )
      `

    referenceStory.style.pointerEvents =
      storyEnter >
      .92
        ? 'auto'
        : 'none'

  }

  /* =======================================================
     PHOTO / FUTURE VIDEO
  ======================================================= */

  if (
    referenceImage
  ) {

    const scale =
      1.025 +
      progress *
      .026

    const moveY =
      progress *
      .9

    referenceImage.style.transform =
      `
        translate3d(
          0,
          ${moveY}vh,
          0
        )

        scale(
          ${scale}
        )
      `

    referenceImage.style.filter =
      `
        saturate(.72)
        contrast(1.04)
        brightness(.69)
      `

  }

}

window.addEventListener(

  'scroll',

  updateReferenceIntro,

  {
    passive:
      true
  }

)

window.addEventListener(

  'resize',

  updateReferenceIntro,

  {
    passive:
      true
  }

)

/* =========================================================
   EXPLORE -> GLOBE
========================================================= */

referenceExplore
  ?.addEventListener(

    'click',

    event => {

      event.preventDefault()
      event.stopImmediatePropagation()
introUnlocked = true
      if (
        !globeSection
      ) {
        return
      }

      if (
        referenceStory
      ) {

        referenceStory.style.transition =
          `
            opacity
            .35s
            ease,

            transform
            .45s
            cubic-bezier(
              .22,
              1,
              .36,
              1
            )
          `

        referenceStory.style.opacity =
          '0'

        referenceStory.style.transform =
          `
            translate3d(
              0,
              -10px,
              0
            )
          `

      }

      if (
        referenceImage
      ) {

        referenceImage.style.transition =
          `
            transform
            .55s
            cubic-bezier(
              .22,
              1,
              .36,
              1
            )
          `

        referenceImage.style.transform =
          `
            translate3d(
              0,
              1vh,
              0
            )

            scale(
              1.06
            )
          `

      }

      window.setTimeout(

        () => {

          globeSection
            .scrollIntoView({

              behavior:
                reducedMotion.matches
                  ? 'auto'
                  : 'smooth',

              block:
                'start'

            })

        },

        220

      )

    },

    true

  )

/* =========================================================
   GLOBE VISIBILITY
========================================================= */

const globeObserver =
  new IntersectionObserver(

    entries => {

      entries.forEach(
        entry => {

          globeVisible =
            entry.isIntersecting

        }
      )

    },

    {
      threshold:
        .05
    }

  )

if (
  globeSection
) {

  globeObserver.observe(
    globeSection
  )

}

/* =========================================================
   ANIMATION
========================================================= */

const clock =
  new THREE.Clock()

function animate() {

  requestAnimationFrame(
    animate
  )

  if (
    !renderer ||
    !scene ||
    !camera ||
    !worldGroup
  ) {
    return
  }

  const delta =
    Math.min(
      clock.getDelta(),
      .05
    )

  const elapsed =
    clock.elapsedTime

  if (
    !dragging &&
    !activeCity &&
    !reducedMotion.matches &&
    performance.now() -
    lastInteraction >
    2200
  ) {

    const idle =
      new THREE.Quaternion()
        .setFromAxisAngle(

          new THREE.Vector3(
            0,
            1,
            0
          ),

          delta *
          .018

        )

    targetQuaternion
      .premultiply(
        idle
      )
      .normalize()

  }

  worldGroup
    .quaternion
    .slerp(

      targetQuaternion,

      reducedMotion.matches
        ? 1
        : .065

    )

  markerObjects.forEach(
    marker => {

      const pulse =
        1 +
        Math.sin(

          elapsed *
          2 +
          marker.userData.phase

        ) *
        .11

      marker.userData
        .ring
        .scale
        .setScalar(
          pulse
        )

    }
  )

  updateConnector()

  renderer.render(
    scene,
    camera
  )

}

/* =========================================================
   INIT GLOBE
========================================================= */

function initGlobe() {

  if (
    !canvas
  ) {
    return
  }

  renderer =
    new THREE.WebGLRenderer({

      canvas,

      antialias:
        true,

      alpha:
        true,

      powerPreference:
        'high-performance'

    })

  renderer.outputColorSpace =
    THREE.SRGBColorSpace

  renderer.setClearColor(
    0x000000,
    0
  )

  scene =
    new THREE.Scene()

  camera =
    new THREE
      .PerspectiveCamera(

        36,

        1,

        .1,

        50

      )

  worldGroup =
    new THREE.Group()

  scene.add(
    worldGroup
  )

  createLights()
  createGlobeSurface()
  createSurfaceDots()
  createGraticule()
  createMarkers()
  resizeRenderer()

  faceCoordinates(
    47,
    15,
    true
  )

  canvas.style.cursor =
    'grab'

  animate()

}

/* =========================================================
   RESIZE
========================================================= */

window.addEventListener(

  'resize',

  () => {

    resizeRenderer()
    updateScroll()
    updateReferenceIntro()

  },

  {
    passive:
      true
  }

)

/* =========================================================
   NORMAL SMOOTH LINKS
========================================================= */

document
  .querySelectorAll(
    'a[href^="#"]'
  )
  .forEach(
    link => {

      link.addEventListener(
        'click',
        event => {

          if (
            link ===
            referenceExplore
          ) {
            return
          }

          const selector =
            link.getAttribute(
              'href'
            )

          if (
            !selector ||
            selector === '#'
          ) {
            return
          }

          const target =
            document.querySelector(
              selector
            )

          if (
            !target
          ) {
            return
          }

          event.preventDefault()

          target.scrollIntoView({

            behavior:
              reducedMotion.matches
                ? 'auto'
                : 'smooth',

            block:
              'start'

          })

        }
      )

    }
  )

/* =========================================================
   START
========================================================= */

async function start() {

  setLoaderProgress(
    5
  )

  const preloadPromise =
    preloadImages()

  try {

    initGlobe()

    setLoaderProgress(
      18
    )

  } catch (
    error
  ) {

    console.warn(
      'Globe initialization failed:',
      error
    )

  }

  await preloadPromise

  updateScroll()
  updateReferenceIntro()
  finishLoader()

}

start()
