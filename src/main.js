import * as THREE from 'three'
import './style.css'

/* =========================================================
   BASE
========================================================= */

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
    image: '01-historic-selfie.jpeg',
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
    image: '08-formal-outdoor.jpeg',
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
    image: '02-west-ham.jpeg',
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
    image: '03-madeira-waterfall.jpeg',
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
    image: '06-liverpool-waterfront.jpeg',
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

    /*
      Japan zatiaľ nemá lokálnu fotku.
      Preto karta zobrazí špeciálny Reel cover.
    */

    image: null,

    text:
      'Jedna z ciest na druhý koniec sveta. Tokyo, Japonsko — ďalšia spomienka, ktorú si chceme nechať navždy.',

    instagramUrl:
      'https://www.instagram.com/reel/DN_BgiWktOJ/'
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
   LIGHT GLOBE VISUAL
========================================================= */

const lightGlobeStyle =
  document.createElement(
    'style'
  )

lightGlobeStyle.textContent = `

.globe-section {
  background: #f4f3ef !important;
  color: #171714 !important;
}

.globe-sticky {
  background:
    radial-gradient(
      circle at 50% 44%,
      #ffffff 0%,
      #f7f6f2 42%,
      #f1f0eb 100%
    ) !important;

  color: #171714 !important;
}

.globe-atmosphere {
  width: min(58vw, 660px) !important;

  background:
    radial-gradient(
      circle,
      rgba(80, 86, 80, .045),
      rgba(80, 86, 80, .018) 48%,
      transparent 70%
    ) !important;

  filter: blur(28px) !important;
}

.globe-title {
  color: rgba(20, 22, 19, .027) !important;
}

.globe-instruction {
  color: #171714 !important;
}

.globe-instruction-icon {
  border-color:
    rgba(20, 22, 19, .22) !important;
}

.city-list {
  color: #171714 !important;
}

.city-list button {
  color: #171714 !important;
}

.globe-progress {
  color: #171714 !important;
}

.globe-progress > div {
  background:
    rgba(20, 22, 19, .13) !important;
}

.globe-progress i {
  background:
    #171714 !important;
}

.mobile-city-button {
  color: #171714 !important;

  border-color:
    rgba(20, 22, 19, .18) !important;
}

.memory-link {
  display: none;

  width: max-content;

  margin-top: 20px;

  padding-bottom: 5px;

  border-bottom:
    1px solid rgba(17, 19, 15, .35);

  font-size: 8px;

  font-weight: 600;

  letter-spacing: .14em;

  text-transform: uppercase;

  color: #11130f;

  transition:
    transform .25s ease,
    opacity .25s ease;
}

.memory-link:hover {
  transform: translateX(4px);
  opacity: .6;
}


/* Japan Reel Cover */

.reel-cover {
  position: absolute;

  inset: 0;

  display: none;

  flex-direction: column;

  justify-content: space-between;

  padding: 24px;

  color: #f2eee5;

  background:
    radial-gradient(
      circle at 70% 25%,
      #454b43,
      transparent 42%
    ),
    linear-gradient(
      145deg,
      #151815,
      #30362f
    );
}

.memory-photo.is-reel .reel-cover {
  display: flex;
}

.memory-photo.is-reel #memory-image {
  display: none;
}

.reel-cover-top {
  display: flex;

  justify-content: space-between;

  font-size: 7px;

  letter-spacing: .16em;

  text-transform: uppercase;

  opacity: .65;
}

.reel-cover-center {
  display: grid;

  place-items: center;

  flex: 1;
}

.reel-play {
  display: grid;

  place-items: center;

  width: 72px;

  height: 72px;

  border:
    1px solid rgba(255,255,255,.5);

  border-radius: 50%;

  font-size: 18px;

  padding-left: 4px;
}

.reel-cover-bottom span {
  display: block;

  font-size: 9px;

  letter-spacing: .18em;

  text-transform: uppercase;

  opacity: .65;
}

.reel-cover-bottom strong {
  display: block;

  margin-top: 5px;

  font-family:
    "Cormorant Garamond",
    Georgia,
    serif;

  font-size: 52px;

  font-weight: 400;

  line-height: .85;
}


/* active city label */

.globe-active-label {
  position: absolute;

  z-index: 15;

  display: flex;

  align-items: center;

  gap: 10px;

  pointer-events: none;

  opacity: 0;

  transform:
    translateY(-50%);

  transition:
    opacity .3s ease;
}

.globe-active-label.is-visible {
  opacity: 1;
}

.globe-active-label-line {
  width: 65px;

  height: 1px;

  background:
    rgba(17, 19, 15, .45);
}

.globe-active-label-copy {
  white-space: nowrap;
}

.globe-active-label-copy span {
  display: block;

  font-size: 6px;

  letter-spacing: .15em;

  text-transform: uppercase;

  opacity: .48;
}

.globe-active-label-copy strong {
  display: block;

  margin-top: 2px;

  font-family:
    "Cormorant Garamond",
    Georgia,
    serif;

  font-size: 22px;

  font-weight: 400;
}


/* globe prompt */

.globe-start-message {
  position: absolute;

  left: 50%;

  bottom: 76px;

  z-index: 11;

  transform:
    translateX(-50%);

  white-space: nowrap;

  font-size: 7px;

  font-weight: 500;

  letter-spacing: .2em;

  text-transform: uppercase;

  color: rgba(17, 19, 15, .52);

  pointer-events: none;
}


@media (max-width: 700px) {

  .globe-atmosphere {
    width: 88vw !important;
  }

  .globe-active-label-line {
    width: 32px;
  }

  .globe-active-label-copy strong {
    font-size: 18px;
  }

  .globe-start-message {
    bottom: 118px;

    font-size: 6px;
  }

  .memory-link {
    margin-top: 15px;
    font-size: 7px;
  }

  .reel-cover {
    padding: 18px;
  }

  .reel-cover-bottom strong {
    font-size: 42px;
  }

}

`

document.head.appendChild(
  lightGlobeStyle
)

/* =========================================================
   REEL COVER
========================================================= */

const reelCover =
  document.createElement(
    'div'
  )

reelCover.className =
  'reel-cover'

reelCover.innerHTML = `

  <div class="reel-cover-top">

    <span>
      SIMONA & MARTIN
    </span>

    <span>
      06 / 07
    </span>

  </div>


  <div class="reel-cover-center">

    <div class="reel-play">
      ▶
    </div>

  </div>


  <div class="reel-cover-bottom">

    <span>
      JAPAN
    </span>

    <strong>
      Tokyo
    </strong>

  </div>

`

memoryPhoto?.appendChild(
  reelCover
)

/* =========================================================
   ACTIVE LABEL
========================================================= */

const activeLabel =
  document.createElement(
    'div'
  )

activeLabel.className =
  'globe-active-label'

activeLabel.innerHTML = `

  <div
    class="globe-active-label-line"
  ></div>

  <div
    class="globe-active-label-copy"
  >

    <span>
      SELECTED
    </span>

    <strong>
      Tokyo
    </strong>

  </div>

`

globeSticky?.appendChild(
  activeLabel
)

/* =========================================================
   SELECT MESSAGE
========================================================= */

const startMessage =
  document.createElement(
    'div'
  )

startMessage.className =
  'globe-start-message'

startMessage.textContent =
  'SELECT A CITY TO START'

globeSticky?.appendChild(
  startMessage
)

/* =========================================================
   CHANGE INSTRUCTION TEXT
========================================================= */

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
    ) * 88
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

const routeObjects =
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
      90 - lat
    ) *
    Math.PI /
    180


  const theta =
    (
      lng + 180
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
   GLOBE SPHERE
========================================================= */

function createGlobeSurface() {

  /*
    skoro biela transparentná guľa
  */

  const geometry =
    new THREE.SphereGeometry(
      globeRadius,
      96,
      64
    )


  const material =
    new THREE.MeshPhysicalMaterial({

      color:
        0xf4f4f1,

      transparent:
        true,

      opacity:
        0.48,

      roughness:
        1,

      metalness:
        0,

      transmission:
        0,

      side:
        THREE.FrontSide

    })


  globeSphere =
    new THREE.Mesh(
      geometry,
      material
    )


  worldGroup.add(
    globeSphere
  )


  /*
    veľmi jemný wireframe povrch
  */

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
        0x6f746f,

      wireframe:
        true,

      transparent:
        true,

      opacity:
        0.065,

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
   SURFACE DOTS
========================================================= */

function createSurfaceDots() {

  const count =
    window.innerWidth < 700
      ? 650
      : 1000


  const positions =
    new Float32Array(
      count * 3
    )


  const goldenAngle =
    Math.PI *
    (
      3 -
      Math.sqrt(5)
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
          count - 1
        )
      ) *
      2


    const radius =
      Math.sqrt(
        1 -
        y * y
      )


    const theta =
      goldenAngle *
      i


    const x =
      Math.cos(theta) *
      radius


    const z =
      Math.sin(theta) *
      radius


    const point =
      new THREE.Vector3(
        x,
        y,
        z
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
        0x454945,

      size:
        window.innerWidth < 700
          ? 0.008
          : 0.006,

      transparent:
        true,

      opacity:
        0.16,

      depthWrite:
        false

    })


  const points =
    new THREE.Points(
      geometry,
      material
    )


  worldGroup.add(
    points
  )

}

/* =========================================================
   GRATICULE
========================================================= */

function createGraticule() {

  const material =
    new THREE.LineBasicMaterial({

      color:
        0x5f645f,

      transparent:
        true,

      opacity:
        0.115,

      depthWrite:
        false

    })


  const radius =
    globeRadius *
    1.009


  /* Latitude */

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

            Math.cos(angle) *
              ringRadius,

            y,

            Math.sin(angle) *
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


  /* Longitude */

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
   ROUTES
========================================================= */

function createArc(
  startData,
  endData
) {

  const start =
    latLngToVector(
      startData.lat,
      startData.lng,
      1
    ).normalize()


  const end =
    latLngToVector(
      endData.lat,
      endData.lng,
      1
    ).normalize()


  const dot =
    THREE.MathUtils.clamp(
      start.dot(
        end
      ),
      -1,
      1
    )


  const omega =
    Math.acos(
      dot
    )


  const sinOmega =
    Math.sin(
      omega
    )


  const points =
    []


  const segments =
    80


  for (
    let i = 0;
    i <= segments;
    i += 1
  ) {

    const t =
      i /
      segments


    let point


    if (
      Math.abs(
        sinOmega
      ) <
      0.0001
    ) {

      point =
        start.clone()
          .lerp(
            end,
            t
          )
          .normalize()

    } else {

      const a =
        Math.sin(
          (
            1 - t
          ) *
          omega
        ) /
        sinOmega


      const b =
        Math.sin(
          t *
          omega
        ) /
        sinOmega


      point =
        start.clone()
          .multiplyScalar(
            a
          )
          .add(
            end.clone()
              .multiplyScalar(
                b
              )
          )
          .normalize()

    }


    const lift =
      1 +
      Math.sin(
        Math.PI *
        t
      ) *
      0.07


    point.multiplyScalar(
      globeRadius *
      1.014 *
      lift
    )


    points.push(
      point
    )

  }


  const geometry =
    new THREE.BufferGeometry()
      .setFromPoints(
        points
      )


  const material =
    new THREE.LineBasicMaterial({

      color:
        0x5f645f,

      transparent:
        true,

      opacity:
        0.16,

      depthWrite:
        false

    })


  const line =
    new THREE.Line(
      geometry,
      material
    )


  line.userData.cityKey =
    endData.key


  routeObjects.push(
    line
  )


  worldGroup.add(
    line
  )

}


function createRoutes() {

  const origin = {
    lat: 48.37,
    lng: 17.64
  }


  ;[
    cities.london,
    cities.madeira,
    cities.liverpool,
    cities.japan,
    cities.florence
  ].forEach(
    city => {

      createArc(
        origin,
        city
      )

    }
  )

}

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
    position.clone()
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


  /* small black point */

  const pointGeometry =
    new THREE.SphereGeometry(
      0.018,
      16,
      16
    )


  const pointMaterial =
    new THREE.MeshBasicMaterial({
      color:
        0x171714
    })


  const point =
    new THREE.Mesh(
      pointGeometry,
      pointMaterial
    )


  marker.add(
    point
  )


  /* tiny ring */

  const ringGeometry =
    new THREE.RingGeometry(
      0.033,
      0.038,
      32
    )


  const ringMaterial =
    new THREE.MeshBasicMaterial({

      color:
        0x171714,

      transparent:
        true,

      opacity:
        0.35,

      side:
        THREE.DoubleSide,

      depthWrite:
        false

    })


  const ring =
    new THREE.Mesh(
      ringGeometry,
      ringMaterial
    )


  ring.position.z =
    0.006


  marker.add(
    ring
  )


  /* invisible larger clickable area */

  const hitGeometry =
    new THREE.SphereGeometry(
      0.11,
      12,
      12
    )


  const hitMaterial =
    new THREE.MeshBasicMaterial({

      transparent:
        true,

      opacity:
        0,

      depthWrite:
        false

    })


  const hit =
    new THREE.Mesh(
      hitGeometry,
      hitMaterial
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
   LIGHTING
========================================================= */

function createLights() {

  const ambient =
    new THREE.AmbientLight(
      0xffffff,
      2.1
    )


  scene.add(
    ambient
  )


  const key =
    new THREE.DirectionalLight(
      0xffffff,
      1.9
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
      0xdde1db,
      1
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
   FACE LOCATION
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
   RESIZE
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

      width < 700
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


  /*
    menší glóbus + viac whitespace
  */

  camera.position.z =
    width < 700
      ? 5.5
      : 5.9


  camera.updateProjectionMatrix()

}

/* =========================================================
   ACTIVE UI
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
            ? 1.7
            : 1
        )


      marker.userData
        .ring
        .material
        .opacity =
          active
            ? 0.85
            : 0.35

    }
  )


  routeObjects.forEach(
    route => {

      const active =
        route.userData
          .cityKey ===
        key


      route.material.opacity =
        active
          ? 0.52
          : 0.12

    }
  )

}

/* =========================================================
   MEMORY
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


  /* image / Reel cover */

  if (
    city.image
  ) {

    memoryPhoto
      .classList
      .remove(
        'is-reel'
      )


    memoryImage.style.display =
      'block'


    memoryImage.src =
      `${BASE}photos/${city.image}`


    memoryImage.alt =
      `${city.title} — Simona a Martin`

  } else {

    memoryPhoto
      .classList
      .add(
        'is-reel'
      )

  }


  /* Instagram button */

  if (
    city.instagramUrl
  ) {

    memoryLink.href =
      city.instagramUrl


    memoryLink.textContent =
      'WATCH JAPAN REEL ↗'


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


  updateActiveUI(
    key
  )


  faceCoordinates(
    city.lat,
    city.lng
  )


  const labelStrong =
    activeLabel
      .querySelector(
        'strong'
      )


  const labelSmall =
    activeLabel
      .querySelector(
        'span'
      )


  if (
    labelStrong
  ) {
    labelStrong.textContent =
      city.title
  }


  if (
    labelSmall
  ) {
    labelSmall.textContent =
      city.country
  }


  activeLabel
    .classList
    .add(
      'is-visible'
    )


  startMessage.style.opacity =
    '0'


  closeMobileMenu()

}


function closeMemoryCard() {

  memoryCard
    .classList
    .remove(
      'is-open'
    )


  activeLabel
    .classList
    .remove(
      'is-visible'
    )


  startMessage.style.opacity =
    '1'


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
  position: absolute;

  left: 18px;
  right: 18px;
  bottom: 118px;

  z-index: 45;

  padding: 14px 18px;

  color: #171714;
  background: #efeee9;

  box-shadow:
    0 25px 70px
    rgba(0,0,0,.15);

  opacity: 0;
  visibility: hidden;

  transform:
    translateY(20px);

  transition:
    opacity .3s ease,
    visibility .3s ease,
    transform .4s cubic-bezier(.22,1,.36,1);
}

.mobile-city-menu.is-open {
  opacity: 1;
  visibility: visible;

  transform:
    translateY(0);
}

.mobile-city-menu button {
  display: grid;

  grid-template-columns:
    35px 1fr auto;

  align-items: center;

  width: 100%;

  padding: 13px 0;

  border-bottom:
    1px solid
    rgba(17,19,15,.12);

  text-align: left;
}

.mobile-city-menu button:last-child {
  border-bottom: 0;
}

.mobile-city-menu span {
  font-size: 7px;
  letter-spacing: .15em;
  opacity: .45;
}

.mobile-city-menu strong {
  font-family:
    "Cormorant Garamond",
    Georgia,
    serif;

  font-size: 27px;

  font-weight: 400;
}

.mobile-city-menu i {
  font-size: 11px;
  font-style: normal;
  opacity: .5;
}

@media (min-width: 701px) {
  .mobile-city-menu {
    display: none;
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

    /* mobile Safari */

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
        0.0055

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
            ? 0.0017
            : 0.0038
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

    memoryCard
      .classList
      .remove(
        'is-open'
      )


    activeLabel
      .classList
      .remove(
        'is-visible'
      )


    activeCity =
      null


    updateActiveUI(
      null
    )

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

    openMemory(

      intersections[0]
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


      canvas.style.cursor =
        'grab'

    }
  )

/* =========================================================
   ACTIVE LABEL POSITION
========================================================= */

function updateActiveLabelPosition() {

  if (
    !activeCity ||
    !camera ||
    !worldGroup
  ) {
    return
  }


  const city =
    cities[
      activeCity
    ]


  const point =
    latLngToVector(

      city.lat,
      city.lng,

      globeRadius *
      1.04

    )


  point.applyQuaternion(
    worldGroup.quaternion
  )


  point.project(
    camera
  )


  const x =
    (
      point.x *
      0.5 +
      0.5
    ) *
    window.innerWidth


  const y =
    (
      -point.y *
      0.5 +
      0.5
    ) *
    window.innerHeight


  const offset =
    window.innerWidth <
    700
      ? 28
      : 40


  activeLabel.style.left =
    `${x + offset}px`


  activeLabel.style.top =
    `${y}px`

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
    distance <= 0
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
      hero.getBoundingClientRect()


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
          ${1.07 + progress * 0.035}
        )
      `

  }

}


window.addEventListener(

  'scroll',

  updateScroll,

  {
    passive: true
  }

)

/* =========================================================
   VISIBILITY
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
        0.05
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
      0.05
    )


  const elapsed =
    clock.elapsedTime


  /*
    veľmi pomalé samovoľné otáčanie
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
          0.018

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
        : 0.065

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
        0.12


      marker.userData
        .ring
        .scale
        .setScalar(
          pulse
        )

    }
  )


  updateActiveLabelPosition()


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
    new THREE.PerspectiveCamera(
      36,
      1,
      0.1,
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

  createRoutes()

  createMarkers()

  resizeRenderer()


  /*
    začiatok orientovaný na Európu
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
    passive: true
  }

)

/* =========================================================
   SMOOTH ANCHORS
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


  finishLoader()

}


start()
