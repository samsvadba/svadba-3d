import * as THREE from 'three'
import './style.css'

const BASE = import.meta.env.BASE_URL

const reducedMotion =
  window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  )

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

    image:
      '01-historic-selfie.jpeg',

    text:
      'Jeden z dvoch začiatkov nášho príbehu. Miesto, odkiaľ vyrazil Martin.'
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

    image:
      '08-formal-outdoor.jpeg',

    text:
      'Druhý začiatok. Miesto, odkiaľ do spoločného príbehu vykročila Simona.'
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

    image:
      '02-west-ham.jpeg',

    text:
      'Futbal, mesto a ďalšia spoločná spomienka. Jedna z ciest, ktoré sú najlepšie vo dvojici.'
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

    image:
      '03-madeira-waterfall.jpeg',

    text:
      'Hory, oceán, vodopády a chvíle, pri ktorých človek na všetko ostatné zabudne.'
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

    image:
      '06-liverpool-waterfront.jpeg',

    text:
      'Aj keď počasie nebolo vždy dokonalé, spoločná cesta áno.'
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

    text:
      'Jedna z ciest na druhý koniec sveta. Tokyo, Japonsko — ďalšia spomienka, ktorú si chceme nechať navždy.',

    instagramUrl:
      'https://www.instagram.com/reel/DN_BgiWktOJ/',

    instagramEmbedUrl:
      'https://www.instagram.com/reel/DN_BgiWktOJ/embed/'
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

    image:
      '07-florence-engagement.jpeg',

    text:
      'Miesto, kde jedna otázka zmenila ďalšiu cestu. Florencia, 1. apríla 2026.'
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

const root =
  document.documentElement


const body =
  document.body


const canvas =
  document.querySelector(
    '#globe-canvas'
  )


const globeSection =
  document.querySelector(
    '#globe-section'
  )


const globeSticky =
  document.querySelector(
    '.globe-sticky'
  )


const florenceSection =
  document.querySelector(
    '.florence'
  )


const hero =
  document.querySelector(
    '.hero'
  )


const heroImage =
  document.querySelector(
    '.hero-media img'
  )


const memoryCard =
  document.querySelector(
    '#memory-card'
  )


const memoryPhoto =
  document.querySelector(
    '.memory-photo'
  )


const memoryImage =
  document.querySelector(
    '#memory-image'
  )


const memoryNumber =
  document.querySelector(
    '#memory-number'
  )


const memoryCountry =
  document.querySelector(
    '#memory-country'
  )


const memoryTitle =
  document.querySelector(
    '#memory-title'
  )


const memoryText =
  document.querySelector(
    '#memory-text'
  )


const memoryLink =
  document.querySelector(
    '#memory-link'
  )


const memoryLat =
  document.querySelector(
    '#memory-lat'
  )


const memoryLng =
  document.querySelector(
    '#memory-lng'
  )


const memoryClose =
  document.querySelector(
    '#memory-close'
  )


const cityButtons =
  [
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

/* =========================================================
   RUNTIME STYLE
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


/* -----------------------------------------
   MEMORY PHOTO
----------------------------------------- */

.memory-photo {
  position:
    relative !important;
}


/* -----------------------------------------
   INSTAGRAM REEL
----------------------------------------- */

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
    #ffffff;
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
    #ffffff;
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


/* -----------------------------------------
   MEMORY LINK
----------------------------------------- */

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


/* -----------------------------------------
   CONNECTOR

   jediná čiara:
   CITY POINT -> VIDEO / PHOTO CARD
----------------------------------------- */

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


/* -----------------------------------------
   START MESSAGE
----------------------------------------- */

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
   INSTAGRAM IFRAME
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
   CONNECTOR SVG
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

let animationFrame


let globeVisible =
  false


let activeCity =
  null


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


let dragging =
  false


let pointerDownX =
  0


let pointerDownY =
  0


let previousPointerX =
  0


let previousPointerY =
  0


let dragDistance =
  0


let lastInteraction =
  performance.now()

/* =========================================================
   LAT LNG
========================================================= */

function latLngToVector(
  lat,
  lng,
  radius = globeRadius
) {

  const phi =
    (
      90 -
      lat
    ) *
    Math.PI /
    180


  const theta =
    (
      lng +
      180
    ) *
    Math.PI /
    180


  return new THREE.Vector3(

    -radius *
      Math.sin(phi) *
      Math.cos(theta),

    radius *
      Math.cos(phi),

    radius *
      Math.sin(phi) *
      Math.sin(theta)

  )

}

/* =========================================================
   GLOBE
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
        .35,

      roughness:
        1,

      metalness:
        0

    })


  globeSphere =
    new THREE.Mesh(
      geometry,
      material
    )


  worldGroup.add(
    globeSphere
  )


  /* subtle triangular wire structure */

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


  const wire =
    new THREE.Mesh(
      wireGeometry,
      wireMaterial
    )


  worldGroup.add(
    wire
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
      i * 3
    ] =
      point.x


    positions[
      i * 3 + 1
    ] =
      point.y


    positions[
      i * 3 + 2
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
        new THREE
          .BufferGeometry()
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
    let longitude = 0;
    longitude < 360;
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


      const cosLat =
        Math.cos(
          latRad
        )


      points.push(

        new THREE.Vector3(

          radius *
          cosLat *
          Math.cos(
            lngRad
          ),

          radius *
          Math.sin(
            latRad
          ),

          radius *
          cosLat *
          Math.sin(
            lngRad
          )

        )

      )

    }


    const geometry =
      new THREE
        .BufferGeometry()
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
   IMPORTANT

   ŽIADNE TRASY MEDZI MESTAMI.

   ČIARA SA VYKRESLÍ AŽ PO VÝBERE
   A IDE Z BODU MESTA PRIAMO KU KARTE.
========================================================= */

/* =========================================================
   MARKERS
========================================================= */

function createMarker(
  city
) {

  const position =
    latLngToVector(

      city.lat,

      city.lng,

      globeRadius *
      1.026

    )


  const marker =
    new THREE.Group()


  marker.position.copy(
    position
  )


  const normal =
    position
      .clone()
      .normalize()


  marker.quaternion
    .setFromUnitVectors(

      new THREE.Vector3(
        0,
        0,
        1
      ),

      normal

    )


  const point =
    new THREE.Mesh(

      new THREE.SphereGeometry(
        .018,
        16,
        16
      ),

      new THREE.MeshBasicMaterial({
        color:
          0x171714
      })

    )


  marker.add(
    point
  )


  const ring =
    new THREE.Mesh(

      new THREE.RingGeometry(
        .031,
        .037,
        32
      ),

      new THREE.MeshBasicMaterial({

        color:
          0x171714,

        transparent:
          true,

        opacity:
          .3,

        side:
          THREE.DoubleSide,

        depthWrite:
          false

      })

    )


  ring.position.z =
    .006


  marker.add(
    ring
  )


  /* larger invisible clicking surface */

  const hit =
    new THREE.Mesh(

      new THREE.SphereGeometry(
        .11,
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


  hit.userData.cityKey =
    city.key


  marker.add(
    hit
  )


  marker.userData = {

    cityKey:
      city.key,

    point,

    ring,

    phase:
      Math.random() *
      Math.PI *
      2

  }


  markerObjects.push(
    marker
  )


  markerHitTargets.push(
    hit
  )


  worldGroup.add(
    marker
  )

}


function createMarkers() {

  cityOrder.forEach(
    key => {

      createMarker(
        cities[key]
      )

    }
  )

}

/* =========================================================
   LIGHT
========================================================= */

function createLights() {

  scene.add(

    new THREE.AmbientLight(
      0xffffff,
      2.1
    )

  )


  const key =
    new THREE.DirectionalLight(
      0xffffff,
      1.8
    )


  key.position.set(
    4,
    3,
    5
  )


  scene.add(
    key
  )


  const fill =
    new THREE.DirectionalLight(
      0xe5e8e2,
      .9
    )


  fill.position.set(
    -5,
    -2,
    2
  )


  scene.add(
    fill
  )

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


  const vector =
    latLngToVector(
      lat,
      lng,
      1
    )
      .normalize()


  const front =
    new THREE.Vector3(
      0,
      0,
      1
    )


  const quaternion =
    new THREE.Quaternion()
      .setFromUnitVectors(
        vector,
        front
      )


  targetQuaternion.copy(
    quaternion
  )


  if (
    immediate
  ) {

    worldGroup
      .quaternion
      .copy(
        targetQuaternion
      )

  }

}

/* =========================================================
   RENDER SIZE
========================================================= */

function resizeRenderer() {

  if (
    !renderer ||
    !camera
  ) {
    return
  }


  const width =
    window.innerWidth


  const height =
    window.innerHeight


  renderer.setPixelRatio(

    Math.min(

      window.devicePixelRatio,

      width <
      700
        ? 1.3
        : 1.7

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


  camera.position.z =
    width <
    700
      ? 5.5
      : 5.9


  camera.updateProjectionMatrix()

}

/* =========================================================
   ACTIVE MARKER
========================================================= */

function updateActiveUI(
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


  markerObjects.forEach(
    marker => {

      const active =
        marker.userData
          .cityKey ===
        key


      marker.userData
        .point
        .scale
        .setScalar(

          active
            ? 1.65
            : 1

        )


      marker.userData
        .ring
        .material
        .opacity =

          active
            ? .8
            : .3

    }
  )

}

/* =========================================================
   INSTAGRAM
========================================================= */

function stopInstagramVideo() {

  if (
    !instagramFrame
  ) {
    return
  }


  /*
    týmto sa video naozaj zastaví,
    keď kartu zavrieme
  */

  instagramFrame.src =
    'about:blank'

}


function showInstagramVideo(
  city
) {

  memoryPhoto
    .classList
    .add(
      'is-instagram'
    )


  instagramFrame.src =
    city.instagramEmbedUrl


  instagramFallbackLink.href =
    city.instagramUrl

}


function showMemoryImage(
  city
) {

  memoryPhoto
    .classList
    .remove(
      'is-instagram'
    )


  stopInstagramVideo()


  memoryImage.style.display =
    'block'


  memoryImage.src =
    `${BASE}photos/${city.image}`


  memoryImage.alt =
    `${city.title} — Simona a Martin`

}

/* =========================================================
   OPEN MEMORY
========================================================= */

function openMemory(
  key
) {

  const city =
    cities[key]


  if (
    !city
  ) {
    return
  }


  activeCity =
    key


  lastInteraction =
    performance.now()


  memoryNumber.textContent =
    city.number


  memoryCountry.textContent =
    city.country


  memoryTitle.textContent =
    city.title


  memoryText.textContent =
    city.text


  memoryLat.textContent =
    city.latLabel


  memoryLng.textContent =
    city.lngLabel


  if (
    city.instagramEmbedUrl
  ) {

    showInstagramVideo(
      city
    )

  } else {

    showMemoryImage(
      city
    )

  }


  if (
    city.instagramUrl
  ) {

    memoryLink.href =
      city.instagramUrl


    memoryLink.textContent =
      'OPEN REEL ON INSTAGRAM ↗'


    memoryLink.style.display =
      'inline-flex'

  } else {

    memoryLink.href =
      '#'


    memoryLink.style.display =
      'none'

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


  updateActiveUI(
    key
  )


  /*
    natočenie glóbusu
    na vybrané miesto
  */

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

  memoryCard
    .classList
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


  stopInstagramVideo()


  activeCity =
    null


  updateActiveUI(
    null
  )


  lastInteraction =
    performance.now()

}


memoryClose
  ?.addEventListener(
    'click',
    closeMemoryCard
  )

/* =========================================================
   CITY BUTTONS
========================================================= */

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
      (
        key,
        index
      ) => {

        const city =
          cities[key]


        return `

          <button
            type="button"
            data-mobile-city="${key}"
          >

            <span>
              ${String(
                index + 1
              ).padStart(
                2,
                '0'
              )}
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
    .join('')


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
    18px;

  right:
    18px;

  bottom:
    118px;

  z-index:
    45;

  padding:
    14px 18px;

  color:
    #171714;

  background:
    #efeee9;

  box-shadow:
    0 25px 70px
    rgba(0,0,0,.15);

  opacity:
    0;

  visibility:
    hidden;

  transform:
    translateY(20px);

  transition:
    opacity .3s ease,
    visibility .3s ease,
    transform .4s
      cubic-bezier(.22,1,.36,1);
}


.mobile-city-menu.is-open {

  opacity:
    1;

  visibility:
    visible;

  transform:
    translateY(0);
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
    13px 0;

  border-bottom:
    1px solid
    rgba(17,19,15,.12);

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


@media (min-width:701px) {

  .mobile-city-menu {

    display:
      none;
  }

}

`


document.head.appendChild(
  mobileMenuStyle
)


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
    !globeVisible
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

    /*
      Safari fallback
    */

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
    !camera
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

    const cityKey =
      intersections[
        0
      ]
        .object
        .userData
        .cityKey


    openMemory(
      cityKey
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


      canvas.style.cursor =
        'grab'

    }
  )

/* =========================================================
   CONNECTOR

   marker -> video/photo card
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
        item.userData
          .cityKey ===
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
      .classList
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


  /*
    karta je väčšinou vľavo.
    Čiara sa preto pripája
    na jej pravú hranu.
  */

  const cardIsLeft =
    cardRect.left <
    (
      stickyRect.left +
      markerX
    )


  const cardX =
    cardIsLeft

      ? cardRect.right -
        stickyRect.left

      : cardRect.left -
        stickyRect.left


  const cardY =

    cardRect.top -
    stickyRect.top +
    Math.min(
      cardRect.height *
      .42,
      150
    )


  connectorLine.setAttribute(
    'x1',
    markerX
  )


  connectorLine.setAttribute(
    'y1',
    markerY
  )


  connectorLine.setAttribute(
    'x2',
    cardX
  )


  connectorLine.setAttribute(
    'y2',
    cardY
  )


  connectorDot.setAttribute(
    'cx',
    markerX
  )


  connectorDot.setAttribute(
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
   SCROLL
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


  if (
    heroImage &&
    hero
  ) {

    const heroRect =
      hero
        .getBoundingClientRect()


    const progress =
      clamp(

        -heroRect.top /
        window.innerHeight

      )


    heroImage.style.transform =
      `
        translate3d(
          0,
          ${progress * 4}vh,
          0
        )

        scale(
          ${1.07 + progress * .035}
        )
      `

  }

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

  animationFrame =
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


  /*
    veľmi jemné automatické
    otáčanie bez aktívneho mesta
  */

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

          marker.userData
            .phase

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


  /*
    čiara sa preto hýbe
    spolu s bodom na glóbuse
  */

  updateConnector()


  renderer.render(
    scene,
    camera
  )

}

/* =========================================================
   INIT
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


  /*
    úvod: Európa
  */

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

  },

  {
    passive:
      true
  }

)

/* =========================================================
   SMOOTH LINKS
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
            document
              .querySelector(
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


  finishLoader()

}


start()
/* =========================================================
   REFERENCE INTRO
   SIMONA & MARTIN
========================================================= */

const referenceHero =
  document.querySelector(
    '.hero-reference'
  )


const referenceStage =
  document.querySelector(
    '.hero-reference-stage'
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


const referenceShade =
  document.querySelector(
    '.hero-reference-shade'
  )


const referenceExplore =
  document.querySelector(
    '.hero-reference-explore'
  )


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


/* =========================================================
   SCROLL STORY
========================================================= */

function updateReferenceIntro() {

  if (
    !referenceHero
  ) {
    return
  }


  const rect =
    referenceHero
      .getBoundingClientRect()


  const travel =
    Math.max(

      referenceHero.offsetHeight -
      window.innerHeight,

      1

    )


  /*
    0 = začiatok intra
    1 = koniec intra / pred glóbusom
  */

  const progress =
    referenceClamp(

      -rect.top /
      travel

    )


  /* -----------------------------------------
     FIRST SCREEN

     SIMONA & MARTIN
     A JOURNEY OF US
  ----------------------------------------- */

  const introOpacity =
    referenceClamp(

      1 -
      progress /
      0.36

    )


  if (
    referenceIntro
  ) {

    /*
      Keď sa používateľ začne hýbať,
      prevezme animáciu scroll.
    */

    if (
      progress >
      0.015
    ) {

      referenceIntro.style.animation =
        'none'

    }


    referenceIntro.style.opacity =
      introOpacity


    referenceIntro.style.transform =
      `
        translate3d(
          0,
          ${-progress * 42}px,
          0
        )
      `

  }


  /* -----------------------------------------
     SECOND SCREEN

     A JOURNEY OF US,
     CAPTURED IN EVERY MOMENT.

     SIMONA & MARTIN

     EXPLORE
  ----------------------------------------- */

  const storyOpacity =
    referenceClamp(

      (
        progress -
        0.27
      ) /
      0.34

    )


  if (
    referenceStory
  ) {

    referenceStory.style.opacity =
      storyOpacity


    referenceStory.style.transform =
      `
        translate3d(
          0,
          ${(1 - storyOpacity) * 38}px,
          0
        )
      `


    /*
      Explore sa dá stlačiť
      až keď je druhá scéna viditeľná.
    */

    referenceStory.style.pointerEvents =
      storyOpacity >
      0.78
        ? 'auto'
        : 'none'

  }


  /* -----------------------------------------
     PHOTO CAMERA MOVEMENT
  ----------------------------------------- */

  if (
    referenceImage
  ) {

    const scale =
      1.035 +
      progress *
      0.085


    referenceImage.style.transform =
      `
        scale(
          ${scale}
        )
      `


    /*
      Počas príbehu obraz veľmi jemne
      tmavne a stráca saturáciu.
    */

    const saturation =
      0.72 -
      progress *
      0.10


    const brightness =
      0.69 -
      progress *
      0.14


    referenceImage.style.filter =
      `
        saturate(
          ${saturation}
        )

        contrast(
          1.04
        )

        brightness(
          ${brightness}
        )
      `

  }


  /* -----------------------------------------
     OVERLAY
  ----------------------------------------- */

  if (
    referenceShade
  ) {

    referenceShade.style.opacity =
      String(

        0.82 +
        progress *
        0.18

      )

  }

}


/* =========================================================
   SCROLL LISTENER
========================================================= */

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


updateReferenceIntro()


/* =========================================================
   EXPLORE -> GLOBE
========================================================= */

referenceExplore
  ?.addEventListener(

    'click',

    event => {

      /*
        Tento listener ide cez capture,
        takže zastaví pôvodný obyčajný
        smooth-scroll listener.
      */

      event.preventDefault()

      event.stopImmediatePropagation()


      if (
        !globeSection
      ) {
        return
      }


      /*
        Reduced motion:
        žiadny filmový prechod.
      */

      if (
        reducedMotion.matches
      ) {

        const oldBehavior =
          document.documentElement
            .style
            .scrollBehavior


        document.documentElement
          .style
          .scrollBehavior =
            'auto'


        window.scrollTo(
          0,
          globeSection.offsetTop
        )


        document.documentElement
          .style
          .scrollBehavior =
            oldBehavior


        return
      }


      /*
        Svetlá clona medzi fotografiou
        a svetlým glóbusom.
      */

      body.classList.add(
        'is-intro-leaving'
      )


      /*
        Fotografiu ešte jemne priblížime.
      */

      if (
        referenceImage
      ) {

        referenceImage.style.transition =
          `
            transform
            .65s
            cubic-bezier(
              .22,
              1,
              .36,
              1
            ),

            filter
            .65s
            ease
          `


        referenceImage.style.transform =
          `
            scale(
              1.16
            )
          `

      }


      if (
        referenceStory
      ) {

        referenceStory.style.transition =
          `
            opacity
            .38s
            ease,

            transform
            .55s
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
              -22px,
              0
            )
          `

      }


      /*
        Po zakrytí scény skočíme
        presne na glóbus.
      */

      window.setTimeout(

        () => {

          const oldBehavior =
            document.documentElement
              .style
              .scrollBehavior


          document.documentElement
            .style
            .scrollBehavior =
              'auto'


          window.scrollTo(
            0,
            globeSection.offsetTop
          )


          requestAnimationFrame(
            () => {

              document.documentElement
                .style
                .scrollBehavior =
                  oldBehavior


              /*
                Odkryjeme už svetlý glóbus.
              */

              window.setTimeout(

                () => {

                  body.classList.remove(
                    'is-intro-leaving'
                  )

                },

                100

              )

            }
          )

        },

        560

      )

    },

    true

  )
