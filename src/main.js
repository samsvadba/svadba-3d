import * as THREE from 'three'
import './style.css'

/* =========================================================
   CONFIG
========================================================= */

const BASE = import.meta.env.BASE_URL

const reducedMotion =
  window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  )

const cities = {
  hlohovec: {
    key: 'hlohovec',
    number: '01 / 06',
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
    number: '02 / 06',
    title: 'Cífer',
    country: 'Slovensko',
    lat: 48.315,
    lng: 17.491,
    latLabel: '48.3150° N',
    lngLabel: '17.4910° E',
    image: '08-formal-outdoor.jpeg',
    text:
      'Druhý začiatok. Miesto, odkiaľ do spoločného príbehu vykročila Simona.'
  },

  london: {
    key: 'london',
    number: '03 / 06',
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
    number: '04 / 06',
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
    number: '05 / 06',
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

  florence: {
    key: 'florence',
    number: '06 / 06',
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

let loadedResources = 0

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
  loadedResources += 1

  const value =
    (
      loadedResources /
      preloadFiles.length
    ) * 85

  setLoaderProgress(
    value
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

            image.onload = () => {
              resourceLoaded()
              resolve()
            }

            image.onerror = () => {
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
    350
  )
}

/* =========================================================
   THREE.JS
========================================================= */

let renderer
let scene
let camera

let stageGroup
let worldGroup

let globeSphere

let animationFrame

const globeRadius =
  1.55

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

let activeCity =
  null

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

let globeVisible =
  false

/* =========================================================
   LAT / LNG
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
    new THREE.MeshPhongMaterial({
      color:
        0x20291f,

      emissive:
        0x080b08,

      shininess:
        4,

      specular:
        0x66755f
    })

  globeSphere =
    new THREE.Mesh(
      geometry,
      material
    )

  worldGroup.add(
    globeSphere
  )

  /* outer atmospheric shell */

  const atmosphereGeometry =
    new THREE.SphereGeometry(
      globeRadius * 1.045,
      64,
      48
    )

  const atmosphereMaterial =
    new THREE.MeshBasicMaterial({
      color:
        0x8ea181,

      transparent:
        true,

      opacity:
        0.055,

      side:
        THREE.BackSide,

      blending:
        THREE.AdditiveBlending,

      depthWrite:
        false
    })

  const atmosphere =
    new THREE.Mesh(
      atmosphereGeometry,
      atmosphereMaterial
    )

  worldGroup.add(
    atmosphere
  )
}

/* =========================================================
   GLOBE DOTS
========================================================= */

function createSurfaceDots() {
  const count =
    window.innerWidth < 700
      ? 650
      : 1100

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
    let index = 0;
    index < count;
    index += 1
  ) {
    const y =
      1 -
      (
        index /
        (
          count - 1
        )
      ) * 2

    const radius =
      Math.sqrt(
        1 -
        y * y
      )

    const angle =
      goldenAngle *
      index

    const x =
      Math.cos(angle) *
      radius

    const z =
      Math.sin(angle) *
      radius

    const vector =
      new THREE.Vector3(
        x,
        y,
        z
      )
        .normalize()
        .multiplyScalar(
          globeRadius *
          1.004
        )

    positions[
      index * 3
    ] =
      vector.x

    positions[
      index * 3 + 1
    ] =
      vector.y

    positions[
      index * 3 + 2
    ] =
      vector.z
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
        0xb9c4ae,

      size:
        window.innerWidth < 700
          ? 0.009
          : 0.007,

      transparent:
        true,

      opacity:
        0.23,

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
   LATITUDE + LONGITUDE LINES
========================================================= */

function createGraticule() {
  const material =
    new THREE.LineBasicMaterial({
      color:
        0xc0c9b7,

      transparent:
        true,

      opacity:
        0.075,

      depthWrite:
        false
    })

  const radius =
    globeRadius *
    1.007

  /* latitude */

  ;[
    -60,
    -30,
    0,
    30,
    60
  ].forEach(
    latitude => {

      const points = []

      const latitudeRadians =
        THREE.MathUtils.degToRad(
          latitude
        )

      const ringRadius =
        Math.cos(
          latitudeRadians
        ) * radius

      const y =
        Math.sin(
          latitudeRadians
        ) * radius

      for (
        let index = 0;
        index <= 128;
        index += 1
      ) {
        const angle =
          (
            index / 128
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

      const line =
        new THREE.Line(
          geometry,
          material
        )

      worldGroup.add(
        line
      )
    }
  )

  /* longitude */

  for (
    let longitude = 0;
    longitude < 360;
    longitude += 30
  ) {
    const points = []

    const longitudeRadians =
      THREE.MathUtils.degToRad(
        longitude
      )

    for (
      let latitude = -90;
      latitude <= 90;
      latitude += 2
    ) {
      const latitudeRadians =
        THREE.MathUtils.degToRad(
          latitude
        )

      const cosLat =
        Math.cos(
          latitudeRadians
        )

      points.push(
        new THREE.Vector3(
          radius *
            cosLat *
            Math.cos(
              longitudeRadians
            ),

          radius *
            Math.sin(
              latitudeRadians
            ),

          radius *
            cosLat *
            Math.sin(
              longitudeRadians
            )
        )
      )
    }

    const geometry =
      new THREE.BufferGeometry()
        .setFromPoints(
          points
        )

    const line =
      new THREE.Line(
        geometry,
        material
      )

    worldGroup.add(
      line
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
      start.dot(end),
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

  const points = []

  const segments =
    72

  for (
    let index = 0;
    index <= segments;
    index += 1
  ) {
    const t =
      index /
      segments

    let point

    if (
      Math.abs(
        sinOmega
      ) < 0.0001
    ) {
      point =
        start.clone()
          .lerp(
            end,
            t
          )
          .normalize()
    } else {
      const startWeight =
        Math.sin(
          (
            1 - t
          ) *
          omega
        ) /
        sinOmega

      const endWeight =
        Math.sin(
          t *
          omega
        ) /
        sinOmega

      point =
        start.clone()
          .multiplyScalar(
            startWeight
          )
          .add(
            end.clone()
              .multiplyScalar(
                endWeight
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
      0.085

    point.multiplyScalar(
      globeRadius *
      1.015 *
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
        0xc8b38b,

      transparent:
        true,

      opacity:
        0.18,

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
    lat:
      48.37,

    lng:
      17.64
  }

  ;[
    cities.london,
    cities.madeira,
    cities.liverpool,
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
   LOCATION MARKERS
========================================================= */

function createMarker(
  city
) {
  const position =
    latLngToVector(
      city.lat,
      city.lng,
      globeRadius *
      1.025
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

  /* central point */

  const pointGeometry =
    new THREE.SphereGeometry(
      0.025,
      18,
      18
    )

  const pointMaterial =
    new THREE.MeshBasicMaterial({
      color:
        0xe9d9b8
    })

  const point =
    new THREE.Mesh(
      pointGeometry,
      pointMaterial
    )

  marker.add(
    point
  )

  /* ring */

  const ringGeometry =
    new THREE.RingGeometry(
      0.045,
      0.052,
      32
    )

  const ringMaterial =
    new THREE.MeshBasicMaterial({
      color:
        0xe7d1a5,

      transparent:
        true,

      opacity:
        0.65,

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
    0.008

  marker.add(
    ring
  )

  /* touch target */

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

    ring,

    point,

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
   LIGHTS
========================================================= */

function createLights() {
  const ambient =
    new THREE.AmbientLight(
      0x899683,
      1.25
    )

  scene.add(
    ambient
  )

  const keyLight =
    new THREE.DirectionalLight(
      0xe7ddc9,
      2.1
    )

  keyLight.position.set(
    4,
    3,
    5
  )

  scene.add(
    keyLight
  )

  const backLight =
    new THREE.DirectionalLight(
      0x6e8067,
      1.4
    )

  backLight.position.set(
    -5,
    -1,
    -4
  )

  scene.add(
    backLight
  )
}

/* =========================================================
   STAR FIELD
========================================================= */

function createStars() {
  const count =
    window.innerWidth < 700
      ? 350
      : 650

  const positions =
    new Float32Array(
      count * 3
    )

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const radius =
      5 +
      Math.random() *
      8

    const theta =
      Math.random() *
      Math.PI *
      2

    const phi =
      Math.acos(
        2 *
        Math.random() -
        1
      )

    positions[
      index * 3
    ] =
      radius *
      Math.sin(phi) *
      Math.cos(theta)

    positions[
      index * 3 + 1
    ] =
      radius *
      Math.cos(phi)

    positions[
      index * 3 + 2
    ] =
      radius *
      Math.sin(phi) *
      Math.sin(theta)
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
        0xe3dfd5,

      size:
        0.018,

      transparent:
        true,

      opacity:
        0.23,

      depthWrite:
        false
    })

  const stars =
    new THREE.Points(
      geometry,
      material
    )

  scene.add(
    stars
  )
}

/* =========================================================
   INITIAL ORIENTATION
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
    ).normalize()

  const desiredFront =
    new THREE.Vector3(
      0,
      0,
      1
    )

  const quaternion =
    new THREE.Quaternion()
      .setFromUnitVectors(
        vector,
        desiredFront
      )

  targetQuaternion.copy(
    quaternion
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
        ? 1.35
        : 1.75
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
    width < 700
      ? 5.35
      : 4.75

  camera.updateProjectionMatrix()

  if (
    canvas
  ) {
    canvas.style.touchAction =
      width < 700
        ? 'pan-y'
        : 'none'
  }
}

/* =========================================================
   OPEN MEMORY
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
        .material
        .color
        .set(
          active
            ? 0xffffff
            : 0xe9d9b8
        )

      marker.userData
        .ring
        .material
        .opacity =
          active
            ? 1
            : 0.65
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
          ? 0.72
          : 0.16
    }
  )
}

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

  memoryImage.src =
    `${BASE}photos/${city.image}`

  memoryImage.alt =
    `${city.title} — Simona a Martin`

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

  memoryCard.classList.add(
    'is-open'
  )

  updateActiveUI(
    key
  )

  faceCoordinates(
    city.lat,
    city.lng
  )

  closeMobileMenu()
}

function closeMemoryCard() {
  memoryCard.classList.remove(
    'is-open'
  )

  activeCity =
    null

  cityButtons.forEach(
    button => {
      button.classList.remove(
        'is-active'
      )
    }
  )

  markerObjects.forEach(
    marker => {

      marker.userData
        .point
        .material
        .color
        .set(
          0xe9d9b8
        )

      marker.userData
        .ring
        .material
        .opacity =
          0.65
    }
  )

  routeObjects.forEach(
    route => {
      route.material.opacity =
        0.18
    }
  )

  lastInteraction =
    performance.now()
}

/* =========================================================
   CITY LIST
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

memoryClose?.addEventListener(
  'click',
  closeMemoryCard
)

/* =========================================================
   MOBILE CITY MENU
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

document
  .querySelector(
    '.globe-sticky'
  )
  ?.appendChild(
    mobileMenu
  )

const mobileMenuStyle =
  document.createElement(
    'style'
  )

mobileMenuStyle.textContent = `
.mobile-city-menu{
  position:absolute;
  left:18px;
  right:18px;
  bottom:118px;
  z-index:45;
  padding:15px 18px;
  color:#11130f;
  background:#e8e2d7;
  box-shadow:0 30px 70px rgba(0,0,0,.35);
  opacity:0;
  visibility:hidden;
  transform:translateY(20px);
  transition:
    opacity .35s ease,
    visibility .35s ease,
    transform .45s cubic-bezier(.22,1,.36,1);
}

.mobile-city-menu.is-open{
  opacity:1;
  visibility:visible;
  transform:translateY(0);
}

.mobile-city-menu button{
  display:grid;
  grid-template-columns:35px 1fr auto;
  align-items:center;
  width:100%;
  padding:14px 0;
  border-bottom:1px solid rgba(17,19,15,.13);
  text-align:left;
}

.mobile-city-menu button:last-child{
  border-bottom:0;
}

.mobile-city-menu span{
  font-size:7px;
  letter-spacing:.15em;
  opacity:.5;
}

.mobile-city-menu strong{
  font-family:
    "Cormorant Garamond",
    Georgia,
    serif;
  font-size:27px;
  font-weight:400;
}

.mobile-city-menu i{
  font-size:12px;
  font-style:normal;
  opacity:.5;
}

@media(min-width:701px){
  .mobile-city-menu{
    display:none;
  }
}
`

document.head.appendChild(
  mobileMenuStyle
)

function openMobileMenu() {
  mobileMenu.classList.add(
    'is-open'
  )

  if (
    mobileCityButton
  ) {
    mobileCityButton
      .querySelector(
        'strong'
      )
      .textContent =
        '×'
  }
}

function closeMobileMenu() {
  mobileMenu.classList.remove(
    'is-open'
  )

  if (
    mobileCityButton
  ) {
    mobileCityButton
      .querySelector(
        'strong'
      )
      .textContent =
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
   POINTER DRAG
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
    /* Safari fallback */
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
    Math.abs(deltaX) +
    Math.abs(deltaY)

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
        0.006
      )

  const pitchAmount =
    window.innerWidth < 700
      ? deltaY * 0.0015
      : deltaY * 0.004

  const pitch =
    new THREE.Quaternion()
      .setFromAxisAngle(
        new THREE.Vector3(
          1,
          0,
          0
        ),
        pitchAmount
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

  activeCity =
    null

  memoryCard
    .classList
    .remove(
      'is-open'
    )

  updateActiveUI(
    null
  )
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
    canvas.getBoundingClientRect()

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

  raycaster.setFromCamera(
    rayPointer,
    camera
  )

  const intersections =
    raycaster.intersectObjects(
      markerHitTargets,
      false
    )

  if (
    intersections.length >
    0
  ) {
    const key =
      intersections[0]
        .object
        .userData
        .cityKey

    openMemory(
      key
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

  const totalMovement =
    Math.abs(
      event.clientX -
      pointerDownX
    ) +
    Math.abs(
      event.clientY -
      pointerDownY
    )

  if (
    totalMovement <
    10 &&
    dragDistance <
    18
  ) {
    raycastCity(
      event
    )
  }

  lastInteraction =
    performance.now()
}

canvas?.addEventListener(
  'pointerdown',
  onPointerDown
)

canvas?.addEventListener(
  'pointermove',
  onPointerMove
)

canvas?.addEventListener(
  'pointerup',
  onPointerUp
)

canvas?.addEventListener(
  'pointercancel',
  () => {

    dragging =
      false

    canvas.style.cursor =
      'grab'
  }
)

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
    section.getBoundingClientRect()

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
    globeProgress.toFixed(
      4
    )
  )

  root.style.setProperty(
    '--florence-progress',
    florenceProgress.toFixed(
      4
    )
  )

  if (
    stageGroup &&
    !activeCity
  ) {
    stageGroup.rotation.y =
      (
        globeProgress -
        0.5
      ) *
      0.22
  }

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

          const target =
            selector &&
            selector !== '#'
              ? document
                  .querySelector(
                    selector
                  )
              : null

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

  /* slow idle rotation */

  if (
    !dragging &&
    !activeCity &&
    !reducedMotion.matches &&
    performance.now() -
      lastInteraction >
      1800
  ) {
    const idleRotation =
      new THREE.Quaternion()
        .setFromAxisAngle(
          new THREE.Vector3(
            0,
            1,
            0
          ),
          delta *
          0.035
        )

    targetQuaternion
      .premultiply(
        idleRotation
      )
      .normalize()
  }

  /* cinematic easing */

  worldGroup
    .quaternion
    .slerp(
      targetQuaternion,
      reducedMotion.matches
        ? 1
        : 0.065
    )

  /* pulse markers */

  markerObjects.forEach(
    (
      marker,
      index
    ) => {

      const pulse =
        1 +
        Math.sin(
          elapsed *
          2.1 +
          marker.userData.phase +
          index
        ) *
        0.16

      marker.userData
        .ring
        .scale
        .setScalar(
          pulse
        )

    }
  )

  /* subtle breathing */

  if (
    stageGroup &&
    !reducedMotion.matches
  ) {
    stageGroup.position.y =
      Math.sin(
        elapsed *
        0.38
      ) *
      0.018
  }

  renderer.render(
    scene,
    camera
  )
}

/* =========================================================
   INIT THREE
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
      38,
      1,
      0.1,
      50
    )

  stageGroup =
    new THREE.Group()

  worldGroup =
    new THREE.Group()

  stageGroup.add(
    worldGroup
  )

  scene.add(
    stageGroup
  )

  createLights()

  createStars()

  createGlobeSurface()

  createSurfaceDots()

  createGraticule()

  createRoutes()

  createMarkers()

  resizeRenderer()

  /* start facing Europe */

  faceCoordinates(
    46,
    10,
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
   WEBGL FAILSAFE
========================================================= */

canvas?.addEventListener(
  'webglcontextlost',
  event => {

    event.preventDefault()

    cancelAnimationFrame(
      animationFrame
    )

    canvas.style.opacity =
      '0'

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
      Math.max(
        20,
        loadedResources /
          preloadFiles.length *
          85
      )
    )

  } catch (
    error
  ) {
    console.warn(
      '3D globe could not start.',
      error
    )
  }

  await preloadPromise

  updateScroll()

  finishLoader()
}

start()
